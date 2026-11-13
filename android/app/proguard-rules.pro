# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# rn-obfuscator-begin
# Manifest entry points. Do not keep ReactPackage or com.rnobfuscator.Str:
# those names were identical in every release DEX.
-keep class **.MainActivity { *; }
-keep class **.MainApplication { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    public java.lang.String getName();
}
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-obfuscationdictionary rn-obfuscator-dict.txt
-classobfuscationdictionary rn-obfuscator-dict.txt
-packageobfuscationdictionary rn-obfuscator-dict.txt
-repackageclasses
# rn-obfuscator-end

# stringfog-begin
# Keep decrypt code, but let R8 rename com.github.megatronking.stringfog.**
-keep,allowobfuscation class com.github.megatronking.stringfog.** { *; }
# stringfog-end

