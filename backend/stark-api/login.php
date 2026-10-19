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
    $statement = db()->prepare('SELECT Access_ID AS access_id, Full_Name AS full_name, Email AS email, Course AS course, Year_Level AS year_level, Age AS age, Location AS location, Password_Hash AS password_hash FROM Users WHERE Access_ID = :access_id LIMIT 1');
    $statement->execute(['access_id' => $accessId]);
    $student = $statement->fetch();
    if (!$student || !password_verify($password, $student['password_hash'])) {
        respond(401, ['status' => 'error', 'message' => 'Access ID or passcode is incorrect.']);
    }

    session_regenerate_id(true);
    $_SESSION['student_access_id'] = $student['access_id'];
    respond(200, [
        'status' => 'success',
        'userData' => [
            'name' => $student['full_name'],
            'id' => $student['access_id'],
            'course' => $student['course'] . ' - ' . $student['year_level'] . ' YEAR',
            'age' => (int)$student['age'],
            'location' => $student['location'] ?? '',
            'email' => $student['email'] ?? '',
        ],
    ]);
} catch (Throwable $error) {
    handle_api_error($error);
}
