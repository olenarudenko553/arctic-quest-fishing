package com.kFjQzLm.VpRnTx.modules

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * AES-256-GCM native module. Key is derived once via PBKDF2-SHA256 from a fixed
 * password + salt (shared with the Cloudflare worker and the JS wrapper) and
 * cached. Wire format: hex(IV(12) ‖ ciphertext ‖ auth_tag(16)).
 */
class Jovinupaxotuxi(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Wijagujo"

    private val random = SecureRandom()

    private val secretKey: SecretKey by lazy {
        val spec = PBEKeySpec(PASSWORD.toCharArray(), SALT, PBKDF2_ITERATIONS, 256)
        val raw = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(spec).encoded
        SecretKeySpec(raw, "AES")
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun pexuvimasire(plain: String): String = encryptUtf8(plain)

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun luwehugozihi(hex: String): String = decryptToUtf8(hex)

    /**
     * v2: encrypt plaintext bytes (passed in as base64url) and return the
     * wire IV‖ciphertext‖tag as base64url. Used with CBOR plaintext.
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun gemefuxolaru(plainB64u: String): String = try {
        BwCodec.bytesToB64u(encryptBytes(BwCodec.b64uToBytes(plainB64u)))
    } catch (_: Exception) {
        ""
    }

    /**
     * v2: decrypt a base64url wire string. Returns plaintext bytes as base64url.
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun jopuwikemavo(wireB64u: String): String = try {
        BwCodec.bytesToB64u(decryptBytes(BwCodec.b64uToBytes(wireB64u)))
    } catch (_: Exception) {
        ""
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun rucumogito(hex: String): String {
        // Encrypt the raw bytes given as hex (not a UTF-8 string). Preserved for
        // callers that treat the payload as binary and hex-encode it themselves.
        return try {
            val normalized = hex.trim()
            if (normalized.isEmpty() || normalized.length % 2 != 0) return ""
            bytesToHex(encryptBytes(hexToBytes(normalized)))
        } catch (_: Exception) {
            ""
        }
    }

    private fun encryptUtf8(plain: String): String = try {
        bytesToHex(encryptBytes(plain.toByteArray(StandardCharsets.UTF_8)))
    } catch (_: Exception) {
        ""
    }

    private fun decryptToUtf8(hex: String): String = try {
        val normalized = hex.trim()
        if (normalized.isEmpty() || normalized.length % 2 != 0) {
            ""
        } else {
            String(decryptBytes(hexToBytes(normalized)), StandardCharsets.UTF_8)
        }
    } catch (_: Exception) {
        ""
    }

    private fun encryptBytes(plain: ByteArray): ByteArray {
        val iv = ByteArray(IV_LEN).also { random.nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(TAG_BITS, iv))
        val ct = cipher.doFinal(plain)
        return iv + ct
    }

    private fun decryptBytes(wire: ByteArray): ByteArray {
        if (wire.size < IV_LEN + TAG_BITS / 8) throw IllegalArgumentException("payload too short")
        val iv = wire.copyOfRange(0, IV_LEN)
        val ct = wire.copyOfRange(IV_LEN, wire.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(TAG_BITS, iv))
        return cipher.doFinal(ct)
    }

    private fun hexToBytes(hex: String): ByteArray {
        val out = ByteArray(hex.length / 2)
        for (i in out.indices) {
            val at = i * 2
            out[i] = hex.substring(at, at + 2).toInt(16).toByte()
        }
        return out
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val chars = CharArray(bytes.size * 2)
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            chars[i * 2] = HEX_DIGITS[v ushr 4]
            chars[i * 2 + 1] = HEX_DIGITS[v and 0x0F]
        }
        return String(chars)
    }


    /* autopad-begin */
    private fun ponuyitavu(): Int = 162
    private fun etotiloq(suvucux: Float, vozizi: Float, uvukodayaq: String): Float {
        val futugiqito: Long = 35770L
        val enobesepoga: Float = 0.6884f
        return enobesepoga
    }
    private fun ufiyoxonixad(umigojegiwu: Int, cujexow: Long): Int {
        val inavopad: Int = 238
        val yimexevote: Int = 171
        return yimexevote
    }
    private fun asicapi(esapoxavoran: String) {}
    private fun evefeb(ufiwopafuji: Float, ijufomok: Int): Int {
        return 94
    }
    private fun kinafigekozi(acatinacecig: Boolean, afelega: Float, sufiguzali: Int): Double {
        return 0.989235
    }
    private fun anacok(nafitup: String, yofesiruqiz: String): Long {
        return 60336L
    }
    private fun atiyujux(otokakiwu: Int, tineke: Float): Boolean {
        val raveju = 24
        return if (raveju > 65) true else false
    }
    private fun alabobizin(ragece: Int): Boolean {
        return false
    }
    private fun ovavobe(sodupiyacot: Long): Float {
        return 0.4571f
    }
    private fun ilivoqic(fepekuyaduqu: String): Int {
        var ugepabuke: Int = 108
        ugepabuke = 89
        return ugepabuke
    }
    private fun ebevumonoba(ijumuzin: Float, nedadu: Int, fiqeworuwoxa: Boolean): Double {
        val latunat = 18
        return if (latunat > 28) 0.593157 else 0.028451
    }
    private fun tebowoz(): Double {
        var yamafabil: Double = 0.448059
        yamafabil = 0.393157
        return yamafabil
    }
    private fun xorusaniqono(fusutenipa: Boolean, akodifavupal: Long): Float {
        val xodukoti = 42
        return if (xodukoti > 56) 0.6375f else 0.1629f
    }
    private fun irokukalobik(amaroramum: Float, osuvoni: Float, podoseqifa: Int): Int {
        val upaganidu = 3
        return if (upaganidu > 21) 17 else 75
    }
    private fun zuloluxoso(enutizomopij: Long): Boolean {
        val izukod: Int = 131
        val zubinikoto: Boolean = true
        return zubinikoto
    }
    private fun uqoladakuwi(): Boolean = false
    private fun owusonujoco(motifoka: Int, yujajoyeku: Int, akemogeq: Int): Double {
        val ufaxufogeyi: Double = 0.275510
        return ufaxufogeyi
    }
    private fun jigayonegicu(zofudecej: Int, ojafom: Float): Long {
        val qapemuxoqoza: Long = 29963L
        return qapemuxoqoza
    }
    private fun taliliro(dudoje: String, vizequjonu: Float): Int = 26
    /* autopad-end */
    companion object {
        private const val PASSWORD = "UXFGDr5v1etaUYZJEnMoDHMZHaAQ"
        private val SALT = byteArrayOf(
            0xb3.toByte(), 0x23, 0x84.toByte(), 0x09, 0xd6.toByte(), 0xa8.toByte(), 0x89.toByte(), 0xf1.toByte(),
            0x0e, 0x87.toByte(), 0x74, 0x60, 0x9c.toByte(), 0xfe.toByte(), 0x44, 0x19,
        )
        private const val PBKDF2_ITERATIONS = 100_000
        private const val IV_LEN = 12
        private const val TAG_BITS = 128
        private val HEX_DIGITS = "0123456789ABCDEF".toCharArray()
    }
}
