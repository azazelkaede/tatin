<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
api_init();

if (empty($_SESSION['student_access_id'])) {
    respond(401, ['status' => 'error', 'message' => 'Please sign in before accessing a profile photo.']);
}

try {
    $pdo = db();
    $accessId = (string)$_SESSION['student_access_id'];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $query = $pdo->prepare('SELECT mime_type, image_data FROM student_photos WHERE student_access_id = ?');
        $query->execute([$accessId]);
        $photo = $query->fetch();
        $dataUrl = $photo
            ? 'data:' . $photo['mime_type'] . ';base64,' . base64_encode($photo['image_data'])
            : null;
        respond(200, ['status' => 'success', 'dataUrl' => $dataUrl]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, ['status' => 'error', 'message' => 'Use GET or POST.']);
    }

    $file = $_FILES['photo'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        respond(422, ['status' => 'error', 'message' => 'Choose a photo to upload.']);
    }
    if ($file['size'] > 2 * 1024 * 1024) {
        respond(422, ['status' => 'error', 'message' => 'Photo must be 2 MB or smaller.']);
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($file['tmp_name']);
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mimeType, $allowedTypes, true) || !getimagesize($file['tmp_name'])) {
        respond(422, ['status' => 'error', 'message' => 'Upload a valid JPEG, PNG, or WebP image.']);
    }

    $imageData = file_get_contents($file['tmp_name']);
    if ($imageData === false) {
        respond(500, ['status' => 'error', 'message' => 'Could not read the uploaded photo.']);
    }

    $save = $pdo->prepare(
        'INSERT INTO student_photos (student_access_id, mime_type, image_data)
         VALUES (:access_id, :mime_type, :image_data)
         ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), image_data = VALUES(image_data)'
    );
    $save->bindValue(':access_id', $accessId);
    $save->bindValue(':mime_type', $mimeType);
    $save->bindValue(':image_data', $imageData, PDO::PARAM_LOB);
    $save->execute();

    respond(200, [
        'status' => 'success',
        'dataUrl' => 'data:' . $mimeType . ';base64,' . base64_encode($imageData),
    ]);
} catch (Throwable $error) {
    handle_api_error($error);
}
