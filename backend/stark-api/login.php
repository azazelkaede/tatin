<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
api_init();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Use POST.']);
}

$data = json_input();
$accessId = trim((string)($data['accessId'] ?? ''));
$password = (string)($data['password'] ?? '');
if ($accessId === '' || $password === '') {
    respond(422, ['status' => 'error', 'message' => 'Enter your access ID and passcode.']);
}

try {
    $statement = db()->prepare('SELECT Access_ID, Full_Name, Email, Course, Year_Level, Age, Location, Password_Hash FROM Users WHERE Access_ID = :access_id LIMIT 1');
    $statement->execute(['access_id' => $accessId]);
    $student = $statement->fetch();
    if (!$student || !password_verify($password, $student['Password_Hash'])) {
        respond(401, ['status' => 'error', 'message' => 'Access ID or passcode is incorrect.']);
    }

    session_regenerate_id(true);
    $_SESSION['student_access_id'] = $student['Access_ID'];
    respond(200, [
        'status' => 'success',
        'userData' => [
            'name' => $student['Full_Name'],
            'id' => $student['Access_ID'],
            'course' => $student['Course'] . ' - ' . $student['Year_Level'] . ' YEAR',
            'age' => (int)$student['Age'],
            'location' => $student['Location'] ?? '',
            'email' => $student['Email'] ?? '',
        ],
    ]);
} catch (Throwable $error) {
    handle_api_error($error);
}
