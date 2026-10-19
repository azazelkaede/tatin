<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
api_init();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Use POST.']);
}

$data = json_input();
$name = trim((string)($data['fullName'] ?? ''));
$accessId = trim((string)($data['accessId'] ?? ''));
$course = trim((string)($data['course'] ?? ''));
$year = filter_var($data['year'] ?? null, FILTER_VALIDATE_INT);
$age = filter_var($data['age'] ?? null, FILTER_VALIDATE_INT);
$email = trim((string)($data['email'] ?? ''));
$location = trim((string)($data['location'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($name === '' || $accessId === '' || $course === '' || $email === '' || $location === '' ||
    $year === false || $year < 1 || $year > 8 || $age === false || $age < 15 || $age > 100 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['status' => 'error', 'message' => 'Fill in every field with valid values.']);
}
if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password) ||
    !preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
    respond(422, ['status' => 'error', 'message' => 'Passcode must have 8+ characters, an uppercase letter, a number, and a special character.']);
}

try {
    $statement = db()->prepare(
        'INSERT INTO Users (Access_ID, Full_Name, Course, Year_Level, Age, Email, Location, Password_Hash)
         VALUES (:access_id, :name, :course, :year_level, :age, :email, :location, :password_hash)'
    );
    $statement->execute([
        'name' => $name,
        'access_id' => $accessId,
        'email' => $email,
        'course' => $course,
        'year_level' => $year,
        'age' => $age,
        'location' => $location,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    respond(201, ['status' => 'success', 'message' => 'Student registered.']);
} catch (PDOException $error) {
    if (in_array((string)$error->getCode(), ['23000', '23505'], true)) {
        respond(409, ['status' => 'error', 'message' => 'That access ID or email is already registered.']);
    }
    handle_api_error($error);
} catch (Throwable $error) {
    handle_api_error($error);
}
