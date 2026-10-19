<?php
declare(strict_types=1);
require_once __DIR__ . '/common.php';
api_init();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Use POST.']);
}
if (empty($_SESSION['student_access_id'])) {
    respond(401, ['status' => 'error', 'message' => 'Please sign in again before submitting enrollment.']);
}

$data = json_input();
$codes = $data['subjects'] ?? null;
if (!is_array($codes) || count($codes) === 0 || count($codes) > 10) {
    respond(422, ['status' => 'error', 'message' => 'Choose between 1 and 10 subjects.']);
}
$codes = array_values(array_unique(array_map(static fn($code) => trim((string)$code), $codes)));
if (count($codes) !== count($data['subjects'])) {
    respond(422, ['status' => 'error', 'message' => 'The subject list contains duplicates or invalid values.']);
}

try {
    $pdo = db();
    $placeholders = implode(',', array_fill(0, count($codes), '?'));
    $lookup = $pdo->prepare("SELECT code, units FROM subjects WHERE code IN ({$placeholders})");
    $lookup->execute($codes);
    $subjects = $lookup->fetchAll();
    if (count($subjects) !== count($codes)) {
        respond(422, ['status' => 'error', 'message' => 'One or more selected subjects are not in the database. Re-import the subject catalog.']);
    }

    $units = array_sum(array_column($subjects, 'units'));
    if ($units > 27) {
        respond(422, ['status' => 'error', 'message' => 'The selected subjects exceed the 27-unit limit.']);
    }

    $pdo->beginTransaction();
    $isPostgres = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
    $insertSql = 'INSERT INTO enrollments (student_access_id, total_units, total_amount) VALUES (?, ?, ?)';
    if ($isPostgres) {
        $insertSql .= ' RETURNING id';
    }
    $insert = $pdo->prepare($insertSql);
    $insert->execute([$_SESSION['student_access_id'], $units, $units * 850]);
    $enrollmentId = $isPostgres ? (int)$insert->fetchColumn() : (int)$pdo->lastInsertId();
    $itemInsert = $pdo->prepare('INSERT INTO enrollment_subjects (enrollment_id, subject_code) VALUES (?, ?)');
    foreach ($codes as $code) {
        $itemInsert->execute([$enrollmentId, $code]);
    }
    $pdo->commit();

    respond(201, ['status' => 'success', 'enrollmentId' => $enrollmentId, 'units' => $units, 'amount' => $units * 850]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handle_api_error($error);
}
