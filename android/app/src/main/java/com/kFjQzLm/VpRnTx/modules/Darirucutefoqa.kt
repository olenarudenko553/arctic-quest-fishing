package com.kFjQzLm.VpRnTx.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityManager
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class Darirucutefoqa(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Udeyoxul"

    @ReactMethod
    fun boguvuhacihulo(promise: Promise) {
        var dexLane = reactApplicationContext.hashCode()
        dexLane = dexLane shl 1
        dexLane = dexLane or 10120
        dexLane = dexLane + 37715
        val laneWord = "ojoc"
        var laneAt = 0
        while (laneAt < laneWord.length) {
            dexLane = dexLane xor laneWord[laneAt].code
            laneAt += 1
        }
        if (dexLane == Int.MIN_VALUE) {
            promise.resolve("")
            return
        }
        val timeoutExecutor = Executors.newSingleThreadScheduledExecutor()
        val localSettled = AtomicBoolean(false)
        fun finish(value: String) {
            if (!localSettled.compareAndSet(false, true)) return
            timeoutExecutor.shutdownNow()
            promise.resolve(value)
        }
        timeoutExecutor.schedule({ finish("") }, 12, TimeUnit.SECONDS)
        try {
            hocidicolabaz { value -> finish(value) }
        } catch (e: Exception) {
            finish("")
        }
    }

    private fun hocidicolabaz(finish: (String) -> Unit) {
        val manager = IntegrityManagerFactory.createStandard(reactApplicationContext.applicationContext)
        val prepareRequest = StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
            .setCloudProjectNumber(CLOUD_PROJECT_NUMBER)
            .build()
        manager.prepareIntegrityToken(prepareRequest)
            .addOnSuccessListener { provider ->
                val tokenRequest = StandardIntegrityManager.StandardIntegrityTokenRequest.builder()
                    .setRequestHash(lahigaragu())
                    .build()
                provider.request(tokenRequest)
                    .addOnSuccessListener { response -> finish(response.token() ?: "") }
                    .addOnFailureListener { finish("") }
            }
            .addOnFailureListener { finish("") }
    }

    private fun lahigaragu(): String {
        val bytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { byte -> "%02x".format(byte) }
    }


    /* autopad-begin */
    private fun ukosavijojoq(epodezomesi: String, tefifuvacet: Boolean, gumezarase: Int): String {
        val igavizolul = 20
        return if (igavizolul > 33) "uyalaso" else "ole"
    }
    private fun xoxusopi(irisupeguna: Float, uwasoca: Long, guqikonevepe: Long): Boolean {
        val qiyutatom: Int = 7
        val ewexuzusad: Boolean = true
        return ewexuzusad
    }
    private fun jesucutu(xegoniwaki: String, lofeca: Long, raguzusoji: Int): Boolean {
        val icicubit: Boolean = false
        return icicubit
    }
    private fun luyuxe(idodoledab: String, fiqiwofuwiro: Boolean, ulagucanovi: Int): Boolean {
        val ovapebedo: Long = 34691L
        val awutuxaq: Boolean = false
        return awutuxaq
    }
    private fun ebacoqemar() {}
    private fun uruqinit(ikamoyava: Boolean): Boolean {
        var ofosojo: Boolean = true
        ofosojo = true
        return ofosojo
    }
    private fun jicejaqovivi(igosilafim: Boolean, uturayetibaz: Long, eronacofuno: Float): String {
        var onocotatu: String = "aje"
        onocotatu = "roruqiki"
        return onocotatu
    }
    private fun ucesazis() {
        val zisonuli: Int = 174
        val tibadesu: Boolean = false
    }
    private fun utiyiyig(nufuwu: Int, ekakuginada: Long, dunozo: String): Int = 246
    private fun luduqinode(fiziva: Boolean): Float {
        val edocawocu: Float = 0.8571f
        return edocawocu
    }
    private fun ojetiqu(uwutop: Int, pomozox: Int): String {
        return "agulu"
    }
    private fun emupopuli(ipiwetodavam: Int, fekurubi: Float): Boolean {
        val aduyudo = 31
        return when {
            aduyudo > 16 -> true
            else -> false
        }
    }
    /* autopad-end */
    companion object {
        private const val CLOUD_PROJECT_NUMBER = 225022121874L
    }
}
