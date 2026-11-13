/* cf-intake:v2 */
package com.kFjQzLm.VpRnTx.modules

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Cf intake module (v2 wire format).
 *
 * Plaintext inside AES = CBOR map with numeric field codes.
 * Each channel (cookie/header/body) is its own CBOR map, encoded as b64url.
 * Body is sent as `d=<b64url(AES(CBOR))>` form field.
 * Response is b64url(AES(CBOR)), decoded by qidigohetusaxa.
 */
class Voruzote(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Koyeworanaz"

    @ReactMethod
    fun mubucucux(fields: ReadableArray, bodyPlain: String, promise: Promise) {
        if (HookGuard.isSuspicious) {
            // Return empty-looking junk indistinguishable from an exception fallback.
            promise.resolve("{\"cookie\":\"\",\"header\":\"\",\"body\":\"\"}")
            return
        }
        try {
            promise.resolve(dupogakiki(fields, bodyPlain))
        } catch (e: Exception) {
            promise.resolve("{\"cookie\":\"\",\"header\":\"\",\"body\":\"\"}")
        }
    }

    @ReactMethod
    fun qidigohetusaxa(plainB64u: String, promise: Promise) {
        try {
            promise.resolve(pixuqaromegu(plainB64u))
        } catch (e: Exception) {
            val empty = Arguments.createMap()
            empty.putNull("redirectUrl")
            empty.putNull("redirectUrlInitial")
            empty.putNull("error")
            empty.putBoolean("blockUser", false)
            promise.resolve(empty)
        }
    }

    @ReactMethod
    fun tasutamefez(baseUrl: String, dataValue: String, headerValue: String, body: String, promise: Promise) {
        Thread {
            try {
                val connection = (URL(bofumohalece(baseUrl)).openConnection() as HttpURLConnection)
                connection.requestMethod = "POST"
                connection.connectTimeout = 25000
                connection.readTimeout = 25000
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                if (dataValue.isNotEmpty()) {
                    connection.setRequestProperty("Cookie", COOKIE_NAME + "=" + dataValue)
                }
                if (headerValue.isNotEmpty()) {
                    connection.setRequestProperty(HEADER_NAME, headerValue)
                }
                connection.setRequestProperty("Accept", "text/plain, */*")
                // Body carries just the b64url wire — this module prepends the
                // per-project form field name so JS stays wire-agnostic.
                val wire = BODY_FIELD + "=" + body
                connection.outputStream.use { stream ->
                    stream.write(wire.toByteArray(Charsets.UTF_8))
                }
                val code = connection.responseCode
                val stream = if (code in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
                promise.resolve(text)
            } catch (e: Exception) {
                promise.resolve("")
            }
        }.start()
    }

    // ---------- v2 protocol constants (mirror cloudflare-worker/index.js CF_PROTOCOL) ----------

    private val requiredFields = arrayOf(
        "appId", "deviceID", "adId", "pushToken", "referer",
        "oneLink", "naming", "userAgent", "app_version", "androidId"
    )

    private val fieldCodes = linkedMapOf(
        "appId" to 1,
        "deviceID" to 2,
        "adId" to 3,
        "pushToken" to 4,
        "referer" to 5,
        "oneLink" to 6,
        "naming" to 7,
        "userAgent" to 8,
        "app_version" to 9,
        "androidId" to 10,
        "event" to 11,
        "device_model" to 12,
        "manufacturer" to 13,
        "locale" to 14,
        "timezone" to 15,
        "network" to 16,
        "screen" to 17,
        "session_id" to 18,
        "play_integrity_token" to 19,
        "os_version" to 20
    )

    private val fieldRoutes = linkedMapOf(
        "appId" to "body",
        "deviceID" to "header",
        "adId" to "cookie",
        "pushToken" to "cookie",
        "referer" to "body",
        "oneLink" to "body",
        "naming" to "body",
        "userAgent" to "cookie",
        "app_version" to "header",
        "androidId" to "cookie",
        "event" to "body",
        "device_model" to "body",
        "manufacturer" to "header",
        "locale" to "body",
        "timezone" to "cookie",
        "network" to "body",
        "screen" to "cookie",
        "session_id" to "body",
        "play_integrity_token" to "body"
    )

    private val dummyBodyKeys = arrayOf("murugo", "niseki", "omatepoj")
    private val extraQuery = linkedMapOf("cu" to "duse", "su" to "rokor", "as" to "vev")

    private val responseCodes = linkedMapOf(
        "redirectUrl" to 1,
        "redirectUrlInitial" to 2,
        "error" to 3,
        "blockUser" to 4
    )

    // ---------- assembly ----------

    private fun dupogakiki(fields: ReadableArray, bodyPlain: String): String {
        val values = LinkedHashMap<String, String>()
        for (pair in cavinicuq(bodyPlain)) {
            values[pair.first] = pair.second
        }
        for (index in requiredFields.indices) {
            val key = requiredFields[index]
            val field = if (index < fields.size()) fields.getString(index) ?: "" else ""
            if (field.isNotEmpty() || !values.containsKey(key)) values[key] = field
        }

        val cookieEntries = ArrayList<Pair<Any, Any?>>()
        val headerEntries = ArrayList<Pair<Any, Any?>>()
        val bodyEntries = ArrayList<Pair<Any, Any?>>()

        for ((key, value) in values) {
            if (dummyBodyKeys.contains(key)) continue
            val code = fieldCodes[key] ?: continue
            val route = fieldRoutes[key] ?: "body"
            val entry: Pair<Any, Any?> = (code as Any) to (value as Any?)
            when (route) {
                "cookie" -> cookieEntries.add(entry)
                "header" -> headerEntries.add(entry)
                else -> bodyEntries.add(entry)
            }
        }

        // decoy entries (string keys — worker drops them as unknown codes)
        dummyBodyKeys.forEachIndexed { index, key ->
            bodyEntries.add((key as Any) to ((index + bodyPlain.length).toString() as Any?))
        }

        val cookieB64u = BwCodec.bytesToB64u(BwCodec.cborEncodeMap(cookieEntries))
        val headerB64u = BwCodec.bytesToB64u(BwCodec.cborEncodeMap(headerEntries))
        val bodyB64u = BwCodec.bytesToB64u(BwCodec.cborEncodeMap(bodyEntries))

        val json = JSONObject()
        json.put("cookie", cookieB64u)
        json.put("header", headerB64u)
        json.put("body", bodyB64u)
        return json.toString()
    }

    private fun cavinicuq(plain: String): List<Pair<String, String>> {
        if (plain.isEmpty()) return emptyList()
        return plain.split("&").mapNotNull { part ->
            if (part.isEmpty()) return@mapNotNull null
            val at = part.indexOf("=")
            val k: String
            val v: String
            if (at < 0) { k = part; v = "" } else { k = part.substring(0, at); v = part.substring(at + 1) }
            try {
                Pair(k, java.net.URLDecoder.decode(v, "UTF-8"))
            } catch (_: Exception) {
                Pair(k, v)
            }
        }
    }

    private fun bofumohalece(base: String): String {
        val root = base.trimEnd('/')
        val params = extraQuery.entries.joinToString("&") { (key, value) ->
            URLEncoder.encode(key, "UTF-8") + "=" + URLEncoder.encode(value, "UTF-8")
        }
        return root + PATH + if (params.isEmpty()) "" else "?" + params
    }

    // ---------- response mapping ----------

    /**
     * Input: b64url of plaintext CBOR bytes (already AES-decrypted on JS side).
     * Decodes CBOR map and maps numeric response codes back to canonical keys.
     */
    private fun pixuqaromegu(plainB64u: String): com.facebook.react.bridge.WritableMap {
        val map = Arguments.createMap()
        val bytes = try { BwCodec.b64uToBytes(plainB64u) } catch (_: Exception) { ByteArray(0) }
        val decoded = if (bytes.isNotEmpty()) BwCodec.cborDecode(bytes) else null
        val raw = decoded as? Map<*, *> ?: run {
            map.putNull("redirectUrl")
            map.putNull("redirectUrlInitial")
            map.putNull("error")
            map.putBoolean("blockUser", false)
            return map
        }

        val byCode = HashMap<Int, Any?>()
        val byText = HashMap<String, Any?>()
        for ((k, v) in raw) {
            when (k) {
                is Int -> byCode[k] = v
                is Long -> byCode[k.toInt()] = v
                is String -> byText[k] = v
            }
        }

        woqobesike(map, "redirectUrl", metawunum(byCode, byText, responseCodes["redirectUrl"]!!, "redirectUrl"))
        woqobesike(map, "redirectUrlInitial", metawunum(byCode, byText, responseCodes["redirectUrlInitial"]!!, "redirectUrlInitial"))
        woqobesike(map, "error", metawunum(byCode, byText, responseCodes["error"]!!, "error"))
        map.putBoolean("blockUser", qupilabusi(tucagomixo(byCode, byText, responseCodes["blockUser"]!!, "blockUser")))
        return map
    }

    private fun woqobesike(map: com.facebook.react.bridge.WritableMap, key: String, value: String?) {
        if (value == null) map.putNull(key) else map.putString(key, value)
    }

    private fun metawunum(byCode: Map<Int, Any?>, byText: Map<String, Any?>, code: Int, fallback: String): String? {
        val raw = tucagomixo(byCode, byText, code, fallback) ?: return null
        val text = raw.toString()
        return if (text.isEmpty()) null else text
    }

    private fun tucagomixo(byCode: Map<Int, Any?>, byText: Map<String, Any?>, code: Int, fallback: String): Any? {
        val fromCode = byCode[code]
        if (fromCode != null) return fromCode
        val fromText = byText[fallback]
        if (fromText != null) return fromText
        return null
    }

    private fun qupilabusi(value: Any?): Boolean = when (value) {
        null -> false
        is Boolean -> value
        is Number -> value.toDouble() != 0.0
        is String -> value.isNotEmpty() && value != "0" && !value.equals("false", true)
        else -> true
    }


    /* autopad-begin */
    private fun wurogebol(): String {
        val ijutedo: Int = 219
        val yobezi: String = "umuper"
        return yobezi
    }
    private fun jamamexafax(ibuzituxaju: Float, gibaworovufa: String, lokaxubo: Int): Long {
        return 29132L
    }
    private fun zoxuva(ediyuvugi: String): Long {
        val sawokuta = 24
        return if (sawokuta > 25) 778L else 47369L
    }
    private fun muruwurumefu(ujamebewaj: String, bavogumesiku: Long) {
        val edusixo: Int = 194
        val kikece: String = "gesinoqe"
    }
    private fun redadujo(woqakosusuy: Float, ijitir: Float): Long {
        val epepetudar: Long = 8021L
        return epepetudar
    }
    private fun nidukaqasit(meseboko: Long): String {
        return "ipob"
    }
    private fun ixapidowupob(enaremuwi: String, oxodobup: Int, wunoburudam: Boolean): Float {
        var wobiwatovoxa: Float = 0.3904f
        wobiwatovoxa = 0.6022f
        return wobiwatovoxa
    }
    private fun avijapu(owamifomezim: Long, onevezumife: Boolean): Int {
        val zaqakiv = 7
        return if (zaqakiv > 4) 120 else 210
    }
    private fun iyemurasug(onedozegixov: Long, soxujodeq: String, buxovika: Int): Boolean {
        val ovuvayiyaroy = 86
        return if (ovuvayiyaroy > 32) false else true
    }
    private fun quboje(idozesifac: Boolean, evibunu: String): Int {
        val yayelox: Long = 24608L
        val uqumen: Int = 246
        return uqumen
    }
    private fun otewece(depamovuru: String, bokoce: Int, iroyeke: String) {}
    private fun iyekamicu(wuyafuya: Long) {
        val lanuvozec: Long = 6898L
        val usodaquqad: Boolean = true
    }
    private fun uwiraveludi(duvibexezivu: Boolean, remujel: Float): Double = 0.267667
    private fun wubicomobit(): String {
        var miwagegoza: String = "uvivivi"
        miwagegoza = "urizo"
        return miwagegoza
    }
    private fun remivivax(juguleqaxo: Boolean): String {
        return "itej"
    }
    private fun polobin(vowipika: Float, ixogevaseja: Float) {
        val ejizatoyo: Int = 118
        val fokeji: String = "elikozig"
    }
    private fun araxidavub(ilajaro: Long, ceguroruxer: String, bodaxa: Boolean): Double {
        val uzuxavuqup: Double = 0.299039
        return uzuxavuqup
    }
    /* autopad-end */
    companion object {
        private const val COOKIE_NAME = "lodob"
        private const val HEADER_NAME = "X-Ofupi"
        private const val PATH = "/cedoy"
        private const val BODY_FIELD = "u"
    }
}
