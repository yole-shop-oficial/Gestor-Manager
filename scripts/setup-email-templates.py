#!/usr/bin/env python3
"""
Configura todos los email templates de Supabase con HTML profesional
branding YOLE SHOP para ambos proyectos (P1 y P2).
"""

import json
import requests
import os
import sys

SUPABASE_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
if not SUPABASE_TOKEN:
    print("❌ Error: Set SUPABASE_ACCESS_TOKEN environment variable")
    sys.exit(1)

PROJECTS = [
    {"name": "P1 (yole-auth)", "ref": os.environ.get("SUPABASE_PROJECT1_REF", "lustmqeqbninkavixttz")},
    {"name": "P2 (yole-business)", "ref": os.environ.get("SUPABASE_PROJECT2_REF", "lqwyidsixjzjffwtrltw")},
]

API_BASE = "https://api.supabase.com/v1"

# ═══════════════════════════════════════════════════════════════════
# SHARED DESIGN COMPONENTS
# ═══════════════════════════════════════════════════════════════════

EMAIL_WRAPPER = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{subject}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<center style="width:100%;background-color:#f0f0f5;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f0f5;">
<tr>
<td align="center" style="padding:20px 16px;">
<!-- Email container -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;margin:0 auto;">
<!-- Top gradient bar -->
<tr>
<td style="height:6px;background:linear-gradient(90deg,#6366f1,#7c3aed,#ec4899);border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
</tr>
<!-- Logo header -->
<tr>
<td align="center" style="background-color:#0a0e27;padding:32px 24px 24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">YOLE</span><span style="font-size:28px;font-weight:900;background:linear-gradient(90deg,#6366f1,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"> SHOP</span>
</td>
</tr>
<tr>
<td align="center">
<span style="font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Gesti&oacute;n Profesional</span>
</td>
</tr>
</table>
</td>
</tr>
<!-- Body content -->
<tr>
<td style="background-color:#ffffff;padding:40px 32px;">
{body}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background-color:#0a0e27;padding:28px 32px;border-radius:0 0 12px 12px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#ffffff;">YOLE SHOP</p>
<p style="margin:0 0 12px;font-size:11px;color:#6b7280;">Gesti&oacute;n profesional de pedidos, comisiones y pagos</p>
<p style="margin:0 0 4px;font-size:10px;color:#4b5563;">La Habana, Cuba &bull; gestor-manager-two.vercel.app</p>
<p style="margin:0;font-size:10px;color:#374151;">Este correo es autom&aacute;tico. No respondas a este mensaje.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</center>
</body>
</html>"""

CTA_BUTTON = """<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
<tr>
<td align="center" style="border-radius:14px;background:linear-gradient(135deg,#6366f1,#7c3aed,#ec4899);">
<a href="{url}" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;" target="_blank">{label}</a>
</td>
</tr>
</table>"""

TOKEN_DISPLAY = """<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
<tr>
<td align="center" style="background-color:#f3f4f6;border-radius:14px;padding:20px 40px;">
<span style="font-size:32px;font-weight:900;color:#6366f1;letter-spacing:6px;font-family:'Courier New',monospace;">{token}</span>
</td>
</tr>
</table>"""

DIVIDER = """<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
<tr>
<td style="height:1px;background-color:#e5e7eb;font-size:0;line-height:0;">&nbsp;</td>
</tr>
</table>"""

WARNING_BOX = """<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
<tr>
<td style="background-color:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;">
<p style="margin:0;font-size:13px;color:#92400e;">⚠️ {message}</p>
</td>
</tr>
</table>"""


# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 1: CONFIRM SIGNUP
# ═══════════════════════════════════════════════════════════════════

confirmation_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🎉</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">¡Bienvenido a YOLE SHOP!</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Confirma tu correo para comenzar a gestionar pedidos y comisiones</p>
</td>
</tr>
</table>
""" + CTA_BUTTON.format(url="{{ .ConfirmationURL }}", label="Confirmar mi correo") + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
<p style="margin:4px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">{{ .ConfirmationURL }}</p>
</td>
</tr>
</table>
"""

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 2: RECOVERY (Reset Password)
# ═══════════════════════════════════════════════════════════════════

recovery_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🔐</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Restablecer contraseña</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Recibimos una solicitud para cambiar tu contraseña</p>
</td>
</tr>
</table>
""" + CTA_BUTTON.format(url="{{ .ConfirmationURL }}", label="Cambiar mi contraseña") + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
<p style="margin:4px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">{{ .ConfirmationURL }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.") + """
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Este enlace expira en 1 hora por seguridad.</p>
"""

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 3: MAGIC LINK
# ═══════════════════════════════════════════════════════════════════

magic_link_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">✨</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Tu enlace de acceso</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Haz clic para iniciar sesión en YOLE SHOP</p>
</td>
</tr>
</table>
""" + CTA_BUTTON.format(url="{{ .ConfirmationURL }}", label="Iniciar sesión") + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
<p style="margin:4px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">{{ .ConfirmationURL }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Este enlace expira pronto y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.") + """
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Enlace de acceso único — no lo compartas con nadie.</p>
"""

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 4: INVITE USER
# ═══════════════════════════════════════════════════════════════════

invite_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">📬</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">¡Fuiste invitado!</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Te han invitado a unirte a YOLE SHOP como gestor</p>
</td>
</tr>
</table>
""" + CTA_BUTTON.format(url="{{ .ConfirmationURL }}", label="Aceptar invitación") + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
<p style="margin:4px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">{{ .ConfirmationURL }}</p>
</td>
</tr>
</table>
""" + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0 0;">
<tr>
<td style="background-color:#ede9fe;border-radius:12px;padding:16px 20px;">
<p style="margin:0;font-size:13px;color:#4c1d95;">📋 Con YOLE SHOP podrás gestionar pedidos, controlar comisiones y recibir pagos de forma profesional.</p>
</td>
</tr>
</table>
"""

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 5: EMAIL CHANGE
# ═══════════════════════════════════════════════════════════════════

email_change_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">📧</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Confirmar nuevo correo</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Confirma tu nueva dirección de correo electrónico</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;">
<tr>
<td style="background-color:#f3f4f6;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Nuevo correo</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#6366f1;">{{ .NewEmail }}</p>
</td>
</tr>
</table>
""" + CTA_BUTTON.format(url="{{ .ConfirmationURL }}", label="Confirmar correo") + """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center">
<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
<p style="margin:4px 0 0;font-size:11px;color:#6366f1;word-break:break-all;">{{ .ConfirmationURL }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no solicitaste este cambio, ignora este correo y tu correo permanecerá sin cambios.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 6: REAUTHENTICATION
# ═══════════════════════════════════════════════════════════════════

reauthentication_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🔑</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Código de verificación</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Usa este código para verificar tu identidad</p>
</td>
</tr>
</table>
""" + TOKEN_DISPLAY.format(token="{{ .Token }}") + """
<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Este código expira pronto. No lo compartas con nadie.</p>
"""

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 7: EMAIL CHANGED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

email_changed_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">📧</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Correo actualizado</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Tu dirección de correo electrónico fue cambiada</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#f3f4f6;border-radius:12px;padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="padding:8px 0;">
<p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Correo anterior</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#374151;">{{ .OldEmail }}</p>
</td>
</tr>
<tr>
<td style="padding:8px 0 0;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Correo nuevo</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#6366f1;">{{ .Email }}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 8: IDENTITY LINKED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

identity_linked_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🔗</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Nuevo método de acceso</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Se vinculó un nuevo método a tu cuenta</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#f3f4f6;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Proveedor vinculado</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#6366f1;">{{ .Provider }}</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b;">para la cuenta {{ .Email }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 9: IDENTITY UNLINKED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

identity_unlinked_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🔓</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Método de acceso eliminado</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Se desvinculó un método de tu cuenta</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#f3f4f6;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Proveedor desvinculado</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#6366f1;">{{ .Provider }}</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b;">de la cuenta {{ .Email }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 10: PASSWORD CHANGED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

password_changed_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🔒</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Contraseña actualizada</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Tu contraseña de YOLE SHOP fue cambiada exitosamente</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0;font-size:14px;color:#065f46;">✅ El cambio se realizó correctamente</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, restablece tu contraseña inmediatamente y contacta a soporte.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 11: PHONE CHANGED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

phone_changed_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">📱</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Teléfono actualizado</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">El número de teléfono de tu cuenta fue cambiado</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#f3f4f6;border-radius:12px;padding:16px 20px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="padding:8px 0;">
<p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Teléfono anterior</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#374151;">{{ .OldPhone }}</p>
</td>
</tr>
<tr>
<td style="padding:8px 0 0;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Teléfono nuevo</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#6366f1;">{{ .Phone }}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 12: MFA FACTOR ENROLLED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

mfa_factor_enrolled_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🛡️</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Verificación añadida</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Se añadió un método de verificación a tu cuenta</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Método añadido</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#065f46;">{{ .FactorType }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")

# ═══════════════════════════════════════════════════════════════════
# TEMPLATE 13: MFA FACTOR UNENROLLED NOTIFICATION
# ═══════════════════════════════════════════════════════════════════

mfa_factor_unenrolled_notification_body = """
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td align="center" style="padding-bottom:8px;">
<span style="font-size:40px;">🛡️</span>
</td>
</tr>
<tr>
<td align="center">
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Verificación eliminada</h1>
<p style="margin:0 0 24px;font-size:15px;color:#64748b;">Se eliminó un método de verificación de tu cuenta</p>
</td>
</tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr>
<td style="background-color:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Método eliminado</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#92400e;">{{ .FactorType }}</p>
</td>
</tr>
</table>
""" + WARNING_BOX.format(message="Si no realizaste este cambio, contacta a soporte inmediatamente.")


# ═══════════════════════════════════════════════════════════════════
# BUILD FULL TEMPLATES + SUBJECTS
# ═══════════════════════════════════════════════════════════════════

templates = {
    # Subjects (en español)
    "mailer_subjects_confirmation": "Confirma tu correo — YOLE SHOP",
    "mailer_subjects_recovery": "Restablecer contraseña — YOLE SHOP",
    "mailer_subjects_magic_link": "Tu enlace de acceso — YOLE SHOP",
    "mailer_subjects_invite": "¡Fuiste invitado a YOLE SHOP!",
    "mailer_subjects_email_change": "Confirma tu nuevo correo — YOLE SHOP",
    "mailer_subjects_reauthentication": "{{ .Token }} es tu código de verificación — YOLE SHOP",
    "mailer_subjects_email_changed_notification": "Tu correo electrónico fue cambiado — YOLE SHOP",
    "mailer_subjects_identity_linked_notification": "Nuevo método de acceso vinculado — YOLE SHOP",
    "mailer_subjects_identity_unlinked_notification": "Método de acceso eliminado — YOLE SHOP",
    "mailer_subjects_password_changed_notification": "Tu contraseña fue cambiada — YOLE SHOP",
    "mailer_subjects_phone_changed_notification": "Tu teléfono fue cambiado — YOLE SHOP",
    "mailer_subjects_mfa_factor_enrolled_notification": "Método de verificación añadido — YOLE SHOP",
    "mailer_subjects_mfa_factor_unenrolled_notification": "Método de verificación eliminado — YOLE SHOP",

    # Templates (full HTML)
    "mailer_templates_confirmation_content": EMAIL_WRAPPER.format(subject="Confirma tu correo", body=confirmation_body),
    "mailer_templates_recovery_content": EMAIL_WRAPPER.format(subject="Restablecer contraseña", body=recovery_body),
    "mailer_templates_magic_link_content": EMAIL_WRAPPER.format(subject="Tu enlace de acceso", body=magic_link_body),
    "mailer_templates_invite_content": EMAIL_WRAPPER.format(subject="Fuiste invitado", body=invite_body),
    "mailer_templates_email_change_content": EMAIL_WRAPPER.format(subject="Confirma tu nuevo correo", body=email_change_body),
    "mailer_templates_reauthentication_content": EMAIL_WRAPPER.format(subject="Código de verificación", body=reauthentication_body),
    "mailer_templates_email_changed_notification_content": EMAIL_WRAPPER.format(subject="Correo actualizado", body=email_changed_notification_body),
    "mailer_templates_identity_linked_notification_content": EMAIL_WRAPPER.format(subject="Método vinculado", body=identity_linked_notification_body),
    "mailer_templates_identity_unlinked_notification_content": EMAIL_WRAPPER.format(subject="Método eliminado", body=identity_unlinked_notification_body),
    "mailer_templates_password_changed_notification_content": EMAIL_WRAPPER.format(subject="Contraseña actualizada", body=password_changed_notification_body),
    "mailer_templates_phone_changed_notification_content": EMAIL_WRAPPER.format(subject="Teléfono actualizado", body=phone_changed_notification_body),
    "mailer_templates_mfa_factor_enrolled_notification_content": EMAIL_WRAPPER.format(subject="Verificación añadida", body=mfa_factor_enrolled_notification_body),
    "mailer_templates_mfa_factor_unenrolled_notification_content": EMAIL_WRAPPER.format(subject="Verificación eliminada", body=mfa_factor_unenrolled_notification_body),

    # Enable notification emails
    "mailer_notifications_email_changed_enabled": True,
    "mailer_notifications_identity_linked_enabled": True,
    "mailer_notifications_identity_unlinked_enabled": True,
    "mailer_notifications_mfa_factor_enrolled_enabled": True,
    "mailer_notifications_mfa_factor_unenrolled_enabled": True,
    "mailer_notifications_password_changed_enabled": True,
    "mailer_notifications_phone_changed_enabled": True,
}


# ═══════════════════════════════════════════════════════════════════
# APPLY TO BOTH PROJECTS
# ═══════════════════════════════════════════════════════════════════

def apply_templates(project_ref, project_name):
    url = f"{API_BASE}/projects/{project_ref}/config/auth"
    headers = {
        "Authorization": f"Bearer {SUPABASE_TOKEN}",
        "Content-Type": "application/json",
    }

    print(f"\n{'='*60}")
    print(f"Aplicando templates a {project_name} ({project_ref})...")
    print(f"{'='*60}")

    resp = requests.patch(url, headers=headers, json=templates, timeout=30)

    if resp.status_code == 200:
        data = resp.json()
        # Verify the templates were applied
        applied = 0
        for key in templates:
            if key.startswith("mailer_templates_") and key.endswith("_content"):
                val = data.get(key, "")
                if len(val) > 100:
                    applied += 1
                    print(f"  ✅ {key}: {len(val)} chars")
                else:
                    print(f"  ⚠️ {key}: {len(val)} chars (¿no se aplicó?)")

        subjects_applied = 0
        for key in templates:
            if key.startswith("mailer_subjects_"):
                val = data.get(key, "")
                if val:
                    subjects_applied += 1
                    print(f"  ✅ {key}: {val}")

        notifications_applied = 0
        for key in templates:
            if key.startswith("mailer_notifications_"):
                val = data.get(key, False)
                if val:
                    notifications_applied += 1
                    print(f"  ✅ {key}: habilitado")
                else:
                    print(f"  ⚠️ {key}: deshabilitado")

        print(f"\n  📧 Templates HTML aplicados: {applied}/13")
        print(f"  📝 Asuntos en español: {subjects_applied}/13")
        print(f"  🔔 Notificaciones habilitadas: {notifications_applied}/7")
        print(f"\n  🎉 {project_name} configurado exitosamente!")
    else:
        print(f"  ❌ Error {resp.status_code}: {resp.text[:500]}")


if __name__ == "__main__":
    for proj in PROJECTS:
        apply_templates(proj["ref"], proj["name"])

    print(f"\n{'='*60}")
    print("✅ Proceso completado — ambos proyectos configurados")
    print(f"{'='*60}")
