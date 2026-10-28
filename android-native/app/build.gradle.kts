plugins { id("com.android.application") }
android {
    namespace = "it.simplexapp.store"
    compileSdk = 36
    defaultConfig { applicationId = "it.simplexapp.store"; minSdk = 26; targetSdk = 36; versionCode = 1; versionName = "1.0.0" }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    lint { abortOnError = true }
}
dependencies { implementation("androidx.core:core:1.15.0"); testImplementation("junit:junit:4.13.2") }
