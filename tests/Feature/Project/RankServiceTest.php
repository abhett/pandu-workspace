<?php

use App\Services\Task\RankService;

test('initial rank returns V', function () {
    $service = new RankService;
    expect($service->initial())->toBe('V');
});

test('generate after produces strictly greater lexicographical string', function () {
    $service = new RankService;
    $r1 = $service->initial(); // 'V'
    $r2 = $service->generateAfter($r1);
    $r3 = $service->generateAfter($r2);

    expect(strcmp($r1, $r2))->toBeLessThan(0)
        ->and(strcmp($r2, $r3))->toBeLessThan(0);
});

test('generate before produces strictly smaller lexicographical string', function () {
    $service = new RankService;
    $r1 = $service->initial(); // 'V'
    $r2 = $service->generateBefore($r1);
    $r3 = $service->generateBefore($r2);

    expect(strcmp($r2, $r1))->toBeLessThan(0)
        ->and(strcmp($r3, $r2))->toBeLessThan(0);
});

test('between produces string strictly between two ranks', function () {
    $service = new RankService;
    $r1 = 'A';
    $r2 = 'Z';
    $mid = $service->between($r1, $r2);

    expect(strcmp($r1, $mid))->toBeLessThan(0)
        ->and(strcmp($mid, $r2))->toBeLessThan(0);
});

test('between handles adjacent characters by extending length', function () {
    $service = new RankService;
    $r1 = 'A';
    $r2 = 'B';
    $mid = $service->between($r1, $r2);

    expect(strcmp($r1, $mid))->toBeLessThan(0)
        ->and(strcmp($mid, $r2))->toBeLessThan(0);
});

test('rebalance generates evenly spaced ranks in order', function () {
    $service = new RankService;
    $taskIds = ['task-1', 'task-2', 'task-3', 'task-4'];
    $rebalanced = $service->rebalance($taskIds);

    expect($rebalanced)->toHaveCount(4);
    $ranks = array_values($rebalanced);
    for ($i = 0; $i < count($ranks) - 1; $i++) {
        expect(strcmp($ranks[$i], $ranks[$i + 1]))->toBeLessThan(0);
    }
});
