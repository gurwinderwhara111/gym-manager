<?php
require_once __DIR__ . '/../layout/header.php';
?>
<div class="page-shell">
    <div class="card" style="max-width: 400px; margin: 40px auto; text-align: center;">
        <h2>Login</h2>
        <p>Enter your credentials to manage your gym</p>
        <form action="/login" method="POST" style="text-align: left; margin-top: 20px;">
            <?= CSRF::field() ?>
            <div style="margin-bottom: 15px;">
                <label>Email</label>
                <input type="email" name="email" required placeholder="email@example.com">
            </div>
            <div style="margin-bottom: 20px;">
                <label>Password</label>
                <input type="password" name="password" required placeholder="********">
            </div>
            <button type="submit" class="btn btn-primary">Sign In</button>
        </form>
    </div>
</div>
<?php
require_once __DIR__ . '/../layout/footer.php';
?>
