package com.kFjQzLm.VpRnTx.modules

import android.content.Context
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Runtime decryptor for AES-256-GCM encrypted asset files (.enc).
 * Wire format: IV(12) | ciphertext | GCM tag(16) — identical to Qelujowofahuhe.
 *
 * Build-time encryption: scripts/security/encryptAssets.js
 * Key: derived the same way as Qelujowofahuhe (or a separate asset-only key).
 */
internal object SecureAssets {
    private const val IV_LEN = 12
    private const val TAG_BITS = 128

    fun decrypt(encBytes: ByteArray, key: ByteArray): ByteArray {
        require(encBytes.size > IV_LEN + TAG_BITS / 8) { "payload too short" }
        val iv = encBytes.copyOfRange(0, IV_LEN)
        val ct = encBytes.copyOfRange(IV_LEN, encBytes.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(TAG_BITS, iv))
        return cipher.doFinal(ct)
    }

    fun readAndDecrypt(ctx: Context, assetName: String, key: ByteArray): ByteArray {
        val enc = ctx.assets.open(assetName).use { it.readBytes() }
        return decrypt(enc, key)
    }

    /* autopad-begin */
    private fun ufodekevil(udimuyiyo: Boolean): Double {
        val ikacopuvu = 36
        return if (ikacopuvu > 49) 0.538255 else 0.506882
    }
    private fun febeqate(onoqixaqovuz: Long, apiwuceroyos: Int): Int {
        var emelumugo: Int = 84
        emelumugo = 78
        return emelumugo
    }
    private fun equwezokuc(efotatukebag: String) {}
    private fun ayadatoneso(osewuy: Boolean): Float {
        var otucasatac: Float = 0.5316f
        otucasatac = 0.6924f
        return otucasatac
    }
    private fun uyiqoza(cesizowag: Int): Int = 248
    private fun rafofiqi(itisiya: Boolean): Float {
        val iyequc: Long = 5226L
        val xuweqiw: Float = 0.0845f
        return xuweqiw
    }
    private fun ruzutabuv(): String {
        val lirede = 90
        return if (lirede > 7) "eqewo" else "aqeb"
    }
    private fun uquten(yituji: String, funasegus: Int, iyalen: Boolean): String {
        val emedofulaxaw: String = "ujobo"
        return emedofulaxaw
    }
    private fun zuvekuxeyuc(agicise: Int, vocokimufiro: Int, omuditu: String): Float {
        val toqexafewu: Float = 0.3120f
        return toqexafewu
    }
    /* autopad-end */
}
