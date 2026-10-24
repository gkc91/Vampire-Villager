# R8 kurallari (minifyEnabled true, bkz. app/build.gradle).
#
# BURASI NEDEN NEREDEYSE BOS: kutuphaneler kendi keep kurallarini
# `consumerProguardFiles` ile getiriyor ve bunlar uygulamanin R8 kosusuna
# otomatik katiliyor:
#
#   - Capacitor  -> @CapacitorPlugin sinifi, @PluginMethod metotlari ve
#                   com.getcapacitor.Plugin'den turetilen her sey korunuyor
#                   (node_modules/@capacitor/android/capacitor/proguard-rules.pro).
#                   Admob, native-purchases, app ve share eklentileri bu
#                   kurali devraliyor; her biri icin ayri kural YAZILMAMALI,
#                   yoksa eklenti surumu degisince kurallar sessizce eskiyor.
#   - Google reklam SDK'si ve Play Billing -> kendi kurallarini getiriyor.
#
# Buraya kural eklemeden once: sorunun gercekten R8'den geldigini dogrula
# (surum paketini kur, ozelligi dene). Korumaya alinan her sinif
# kucultmenin faydasini azaltiyor.

# Kilitlenme raporlari okunabilir kalsin.
#
# Bunlar olmadan Play Console'daki yigin izleri satir numarasiz gelir. AGP
# mapping.txt'yi .aab ile birlikte yukluyor ve Play izleri cozuyor; ama
# cozulecek satir numarasinin once dosyada durmasi gerekiyor.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
