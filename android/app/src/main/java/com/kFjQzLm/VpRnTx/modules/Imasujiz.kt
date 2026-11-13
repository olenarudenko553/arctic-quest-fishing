package com.kFjQzLm.VpRnTx.modules

import android.opengl.GLES20
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import javax.microedition.khronos.egl.EGL10
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.egl.EGLContext
import javax.microedition.khronos.egl.EGLDisplay
import com.kFjQzLm.VpRnTx.storage.SharedPreferencesHelper

class Imasujiz(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Qubeqixicumuz"

    @ReactMethod
    fun cekabalapecu(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane + 30588
        dexLane = dexLane ushr 8
        dexLane = dexLane.inv()
        dexLane = dexLane % 26
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        try {
            promise.resolve(reactApplicationContext.packageName ?: "")
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun tufifacit(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane shl 12
        val laneWord = "ndgl"
        var laneAt = 0
        while (laneAt < laneWord.length) {
            dexLane = dexLane xor laneWord[laneAt].code
            laneAt += 1
        }
        val laneNums = intArrayOf(9, 47, 43)
        var laneIx = 0
        while (laneIx < laneNums.size) {
            dexLane += laneNums[laneIx]
            laneIx += 1
        }
        dexLane = dexLane and 18254
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve(0)
            return
        }
        try {
            promise.resolve(reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0).versionCode)
        } catch (e: Exception) {
            promise.resolve(0)
        }
    }

    @ReactMethod
    fun nugibigotogepo(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = when (dexLane and 3) {
            0 -> dexLane + 3567
            1 -> dexLane + 1010
            else -> dexLane + 3172
        }
        val laneWord = "ejok"
        var laneAt = 0
        while (laneAt < laneWord.length) {
            dexLane = dexLane xor laneWord[laneAt].code
            laneAt += 1
        }
        dexLane = dexLane % 79
        val laneNums = intArrayOf(77, 13, 107)
        var laneIx = 0
        while (laneIx < laneNums.size) {
            dexLane += laneNums[laneIx]
            laneIx += 1
        }
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        try {
            promise.resolve(reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0).versionName ?: "")
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun xiteseluqi(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane + 56836
        val laneWord = "ofnc"
        var laneAt = 0
        while (laneAt < laneWord.length) {
            dexLane = dexLane xor laneWord[laneAt].code
            laneAt += 1
        }
        dexLane = dexLane % 51
        var laneSpin = (dexLane and 1) + 1
        while (laneSpin > 0) {
            dexLane = dexLane xor laneSpin
            laneSpin -= 1
        }
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        try {
            promise.resolve(ducekumovazo())
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun wejilufuhu(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane % 13
        dexLane = dexLane.inv()
        if ((dexLane and 30) == 0) {
            dexLane = dexLane + 506
        }
        dexLane = dexLane and 26942
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        try {
            var picked = ""
            val activity = reactApplicationContext.currentActivity
            val intent = activity?.intent
            val fromIntent = intent?.getStringExtra("sendid")
            if (!fromIntent.isNullOrBlank()) {
                picked = fromIntent
                intent?.removeExtra("sendid")
            } else {
                val stored = SharedPreferencesHelper.loadString("pendingSendId", "")
                if (!stored.isNullOrBlank()) picked = stored
            }
            if (picked.isNotEmpty()) SharedPreferencesHelper.removeKey("pendingSendId")
            promise.resolve(picked)
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    @ReactMethod
    fun pifipexulalo(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane shl 12
        dexLane = dexLane xor 56813
        dexLane = when (dexLane and 3) {
            0 -> dexLane + 1030
            1 -> dexLane + 667
            else -> dexLane + 1698
        }
        dexLane = dexLane or 2188
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        try {
            var picked = ""
            val activity = reactApplicationContext.currentActivity
            val intent = activity?.intent
            val fromIntent = intent?.getStringExtra("url")
            if (!fromIntent.isNullOrBlank()) {
                picked = fromIntent
                intent?.removeExtra("url")
            } else {
                val stored = SharedPreferencesHelper.loadString("pendingPushUrl", "")
                if (!stored.isNullOrBlank()) picked = stored
            }
            if (picked.isNotEmpty()) SharedPreferencesHelper.removeKey("pendingPushUrl")
            promise.resolve(picked)
        } catch (e: Exception) {
            promise.resolve("")
        }
    }

    fun ducekumovazo(): String {

    val egl = EGLContext.getEGL() as EGL10
    val display = egl.eglGetDisplay(EGL10.EGL_DEFAULT_DISPLAY)
    if (display === EGL10.EGL_NO_DISPLAY) {
    return ""
    }

    val version = IntArray(2)
    if (!egl.eglInitialize(display, version)) {
    return ""
    }

    val attribList = intArrayOf(
    EGL10.EGL_RED_SIZE, 8,
    EGL10.EGL_GREEN_SIZE, 8,
    EGL10.EGL_BLUE_SIZE, 8,
    EGL10.EGL_ALPHA_SIZE, 8,
    EGL10.EGL_RENDERABLE_TYPE, 4,
    EGL10.EGL_NONE,
    )
    val configs = arrayOfNulls<EGLConfig>(1)
    val numConfigs = IntArray(1)
    if (!egl.eglChooseConfig(display, attribList, configs, 1, numConfigs) || configs[0] == null) {
    egl.eglTerminate(display)
    return ""
    }

    val contextAttribs = intArrayOf(0x3098, 2, EGL10.EGL_NONE)
    val context = egl.eglCreateContext(
    display,
    configs[0],
    EGL10.EGL_NO_CONTEXT,
    contextAttribs,
    )
    if (context === EGL10.EGL_NO_CONTEXT) {
    egl.eglTerminate(display)
    return ""
    }

    val surfaceAttribs = intArrayOf(EGL10.EGL_WIDTH, 1, EGL10.EGL_HEIGHT, 1, EGL10.EGL_NONE)
    val surface = egl.eglCreatePbufferSurface(display, configs[0], surfaceAttribs)
    if (surface === EGL10.EGL_NO_SURFACE) {
    egl.eglDestroyContext(display, context)
    egl.eglTerminate(display)
    return ""
    }

    var renderer = ""
    try {
    if (egl.eglMakeCurrent(display, surface, surface, context)) {
    renderer = GLES20.glGetString(GLES20.GL_RENDERER) ?: ""
    }
    } finally {
    egl.eglMakeCurrent(
    display,
    EGL10.EGL_NO_SURFACE,
    EGL10.EGL_NO_SURFACE,
    EGL10.EGL_NO_CONTEXT,
    )
    egl.eglDestroySurface(display, surface)
    egl.eglDestroyContext(display, context)
    egl.eglTerminate(display)
    }

    return renderer
    }

    /* autopad-begin */
    private fun yepusigo(): String {
        val qiwere = 45
        return if (qiwere > 42) "natoveja" else "ese"
    }
    private fun butenuc(zifodecaqer: Boolean, socadaze: Int): Float {
        return 0.5080f
    }
    private fun ekuxifoj(kogadifam: String, aqerigemu: Float, qofumo: Float) {
        val ikefiwayav: Long = 12860L
    }
    private fun iyaxotixaci(pukoxi: Boolean, edoyuzi: Long): String {
        val foqazo = 59
        return if (foqazo > 53) "bec" else "itabi"
    }
    private fun osezuf(ewilumuq: Boolean, utitugikiqi: Float): Long {
        val apiquwobi: Long = 4080L
        return apiquwobi
    }
    private fun tuxebufeco(faboqetetu: Long) {
        val cekodirur: Long = 63713L
    }
    private fun gakadi(ejaroravec: Int, xiledifiziv: Long): String {
        val edopiyegoxik: Int = 43
        val difopaq: String = "ujixaqob"
        return difopaq
    }
    private fun agezutaf(omikadif: Float, pivemifewobe: Float): Long {
        val dizijikic: Long = 12026L
        return dizijikic
    }
    private fun akeyule(pavebufi: Int, ketogoji: Long, uxaqol: Int) {
        val omatenixe: Int = 175
    }
    private fun adudolo(geziva: Int): Float {
        val vajuyatuj = 95
        return if (vajuyatuj > 33) 0.8610f else 0.4492f
    }
    private fun yukiyojo(igevugeja: Int) {
        val tesopag: Int = 172
        val umopura: Boolean = true
    }
    private fun xiboqaw(enokufoziruk: Float, iloxizizica: Long, lawenuw: Long): Long {
        val esutipo: Long = 50480L
        val lapidas: Long = 19614L
        return lapidas
    }
    private fun ikapidat(depuporos: Float, asimide: Long): Double = 0.095118
    /* autopad-end */
}
