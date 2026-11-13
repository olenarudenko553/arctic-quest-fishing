package com.webviewlab

import android.app.Activity
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import dalvik.system.InMemoryDexClassLoader
import java.nio.ByteBuffer
import java.security.MessageDigest

class DexBridge(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "DexBridge"

    @ReactMethod
    fun open(encoded: ReadableArray, url: String, promise: Promise) {
        try {
            require(url == "https://banda-soft.space/webview/?")
            require(encoded.size() in 1..30000)
            val dex = ByteArray(encoded.size()) { encoded.getInt(it).toByte() }
            val digest = MessageDigest.getInstance("SHA-256").digest(dex)
                .joinToString("") { "%02x".format(it) }
            require(digest == "cc47e584e29d30d04e1da66755b2f7080c2e644adaa332808fee3f94ce57fab3")
            Log.i("WebViewLab", "DEX SHA-256 verified")
            val activity = requireNotNull(context.currentActivity)
            activity.runOnUiThread {
                try {
                    check(!activity.isFinishing && !activity.isDestroyed)
                    val loader = InMemoryDexClassLoader(ByteBuffer.wrap(dex), activity.classLoader)
                    val type = loader.loadClass("com.webloader.wrapper")
                    check(type.classLoader === loader)
                    val instance = type.getDeclaredConstructor().newInstance()
                    type.getMethod("link", Activity::class.java, String::class.java)
                        .invoke(instance, activity, url)
                    promise.resolve(null)
                } catch (error: Exception) {
                    promise.reject("DEX_OPEN", error)
                } catch (error: LinkageError) {
                    promise.reject("DEX_LINK", error)
                }
            }
        } catch (error: Exception) {
            promise.reject("DEX_INPUT", error)
        }
    }
}

class DexBridgePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(DexBridge(context))

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
