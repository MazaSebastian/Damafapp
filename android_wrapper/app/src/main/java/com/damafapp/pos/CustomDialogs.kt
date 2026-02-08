package com.damafapp.pos

import android.app.Activity
import android.app.AlertDialog
import android.graphics.Color
import android.view.View
import com.google.android.material.snackbar.Snackbar

enum class SnackbarType {
    SUCCESS, ERROR, INFO, WARNING
}

/**
 * Shows a custom styled alert dialog matching app theme
 */
fun Activity.showCustomAlert(title: String, message: String) {
    AlertDialog.Builder(this, R.style.CustomAlertDialog)
        .setTitle(title)
        .setMessage(message)
        .setPositiveButton("OK", null)
        .show()
}

/**
 * Shows a custom styled confirmation dialog
 */
fun Activity.showCustomConfirm(
    title: String, 
    message: String,
    onConfirm: () -> Unit,
    onCancel: () -> Unit = {}
) {
    AlertDialog.Builder(this, R.style.CustomAlertDialog)
        .setTitle(title)
        .setMessage(message)
        .setPositiveButton("Confirmar") { _, _ -> onConfirm() }
        .setNegativeButton("Cancelar") { _, _ -> onCancel() }
        .show()
}

/**
 * Shows a styled Snackbar with app colors
 */
fun Activity.showStyledSnackbar(message: String, type: SnackbarType) {
    val rootView = findViewById<View>(android.R.id.content)
    showStyledSnackbar(rootView, message, type)
}

/**
 * Shows a styled Snackbar on a specific view
 */
fun showStyledSnackbar(view: View, message: String, type: SnackbarType) {
    val snackbar = Snackbar.make(view, message, Snackbar.LENGTH_LONG)
    
    val bgColor = when(type) {
        SnackbarType.SUCCESS -> Color.parseColor("#10b981") // green
        SnackbarType.ERROR -> Color.parseColor("#ef4444") // red
        SnackbarType.WARNING -> Color.parseColor("#f59e0b") // orange
        SnackbarType.INFO -> Color.parseColor("#3b82f6") // blue
    }
    
    snackbar.view.setBackgroundColor(bgColor)
    snackbar.setTextColor(Color.WHITE)
    snackbar.show()
}
