<?php
// ══════════════════════════════════════════════════
//  SHOPCOTTO — Admin Setup (Run ONCE, then DELETE)
//  Visit: http://localhost/ShopcottoProject/setup_admin.php
// ══════════════════════════════════════════════════
require_once __DIR__ . '/api/config.php';

$username = 'Itubam';
$password = 'mabuti';
$hash     = password_hash($password, PASSWORD_BCRYPT);

// Delete existing admins and insert fresh
$conn->query("DELETE FROM admins");
$conn->query("INSERT INTO admins (username, password) VALUES ('$username', '$hash')");

if ($conn->affected_rows > 0) {
    echo "<div style='font-family:sans-serif;padding:40px;background:#0E0A07;color:#E5B04A;min-height:100vh'>";
    echo "<h2>✅ Admin account created successfully!</h2>";
    echo "<p style='color:#FAF3EA;margin-top:12px'>Username: <strong>$username</strong></p>";
    echo "<p style='color:#FAF3EA'>Password: <strong>$password</strong></p>";
    echo "<p style='color:rgba(250,243,234,0.5);margin-top:20px'>⚠️ DELETE this file now for security!</p>";
    echo "<a href='admin.html' style='display:inline-block;margin-top:20px;padding:12px 28px;background:#C9922A;color:#0E0A07;border-radius:100px;font-weight:700;text-decoration:none'>→ Go to Admin Panel</a>";
    echo "</div>";
} else {
    echo "<div style='font-family:sans-serif;padding:40px;background:#0E0A07;color:#FF7070'>";
    echo "<h2>❌ Setup failed: " . $conn->error . "</h2>";
    echo "</div>";
}
$conn->close();
?>