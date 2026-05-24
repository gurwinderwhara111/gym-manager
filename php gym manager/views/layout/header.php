<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= CSRF::token() ?>">
    <meta name="theme-color" content="#111827">
    <title><?= APP_NAME ?></title>
    <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<div id="toast" class="toast"></div>
<div id="offline-banner" class="offline-banner" style="display:none"></div>
