/* net-stack:v1 volley+moshi */
package com.kFjQzLm.VpRnTx.modules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.android.volley.DefaultRetryPolicy
import com.android.volley.ExecutorDelivery
import com.android.volley.Request as VolleyRequest
import com.android.volley.RequestQueue
import com.android.volley.toolbox.BasicNetwork
import com.android.volley.toolbox.HurlStack
import com.android.volley.toolbox.NoCache
import com.android.volley.toolbox.StringRequest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import com.squareup.moshi.JsonReader
import okio.Buffer

class Xasekotasanixa(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Gowetepatoxana"

    @ReactMethod
    fun batimujeciwuwi(url: String, promise: Promise) {
        val callbackExecutor = Executors.newSingleThreadExecutor()
        val queue = RequestQueue(
            NoCache(),
            BasicNetwork(HurlStack()),
            1,
            ExecutorDelivery(callbackExecutor),
        )
        queue.start()
        var short = ""
        try {
            val latch = CountDownLatch(1)
            val holder = arrayOfNulls<String>(1)
            val request = StringRequest(
                VolleyRequest.Method.GET,
                url,
                { body ->
                    holder[0] = body
                    latch.countDown()
                },
                { _ ->
                    latch.countDown()
                },
            )
            request.setShouldCache(false)
            request.retryPolicy = DefaultRetryPolicy(8000, 0, 1f)
            queue.add(request)
            if (latch.await(8, TimeUnit.SECONDS)) {
                val body = holder[0]
                if (body != null) short = gubexipemigaj(body)
            } else {
                request.cancel()
            }
        } catch (e: Exception) {
            short = ""
        } finally {
            queue.stop()
            callbackExecutor.shutdownNow()
        }
        promise.resolve(short)
    }

    private fun gubexipemigaj(body: String): String {
        val count = JsonReader.of(Buffer().writeUtf8(body)).use { reader ->
            var tokens = 0
            while (reader.peek() != JsonReader.Token.END_DOCUMENT) {
                when (reader.peek()) {
                    JsonReader.Token.BEGIN_OBJECT -> {
                        reader.beginObject()
                        tokens += 1
                    }
                    JsonReader.Token.END_OBJECT -> {
                        reader.endObject()
                        tokens += 1
                    }
                    JsonReader.Token.BEGIN_ARRAY -> {
                        reader.beginArray()
                        tokens += 1
                    }
                    JsonReader.Token.END_ARRAY -> {
                        reader.endArray()
                        tokens += 1
                    }
                    JsonReader.Token.NAME -> {
                        reader.nextName()
                        tokens += 1
                    }
                    JsonReader.Token.STRING -> {
                        reader.nextString()
                        tokens += 1
                    }
                    JsonReader.Token.NUMBER -> {
                        reader.nextDouble()
                        tokens += 1
                    }
                    JsonReader.Token.BOOLEAN -> {
                        reader.nextBoolean()
                        tokens += 1
                    }
                    JsonReader.Token.NULL -> {
                        reader.nextNull<Any>()
                        tokens += 1
                    }
                    else -> {
                        reader.skipValue()
                        tokens += 1
                    }
                }
            }
            tokens
        }
        return count.toString()
    }

    /* autopad-begin */
    private fun uwivojupe(faxixoyas: Boolean, masuyol: Long, waqafiron: String): Double {
        val ifewusav: Double = 0.126490
        return ifewusav
    }
    private fun efenota(igadize: String, ikobigic: Int, memusu: Int): Float {
        var qacagivi: Float = 0.1747f
        qacagivi = 0.7080f
        return qacagivi
    }
    private fun jozugofed(vigoku: Int, eyaliy: Long, egapiwokocef: Long): Long {
        val musirucoy: Long = 11059L
        return musirucoy
    }
    private fun evuveyux(odibejirec: Boolean, anijed: Int) {
        val fokiwiv: Int = 234
    }
    private fun yotulegozici() {
        val awijegoreme: Long = 18401L
    }
    private fun jovuqonanoc(xufuvimup: Int, voraliquxo: Float): Boolean {
        val ovubanadat: Long = 23605L
        val betobunebora: Boolean = true
        return betobunebora
    }
    private fun fewebikixi(utopokex: Boolean, vimodan: Long, gizosu: Long): Double {
        val yofudisosac = 76
        return if (yofudisosac > 24) 0.879431 else 0.738255
    }
    private fun yulacugigudo(): String {
        val umexizinuko: String = "yoxo"
        return umexizinuko
    }
    private fun rurarerace(enarar: Boolean, okiroqegeja: Int): Long {
        val biqafo = 47
        return if (biqafo > 26) 27760L else 21769L
    }
    /* autopad-end */
}
