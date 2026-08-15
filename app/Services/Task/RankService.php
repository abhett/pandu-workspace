<?php

namespace App\Services\Task;

final class RankService
{
    public const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    public const INITIAL_RANK = 'V';

    public const MAX_LENGTH = 50;

    /**
     * Get the default initial rank.
     */
    public function initial(): string
    {
        return self::INITIAL_RANK;
    }

    /**
     * Check if a rank needs rebalancing.
     */
    public function needsRebalance(string $rank): bool
    {
        return strlen($rank) > self::MAX_LENGTH;
    }

    /**
     * Generate a string that is lexicographically strictly between $prev and $next.
     */
    public function between(?string $prev, ?string $next): string
    {
        if ($prev === null && $next === null) {
            return self::INITIAL_RANK;
        }

        if ($prev === null) {
            return $this->generateBefore($next);
        }

        if ($next === null) {
            return $this->generateAfter($prev);
        }

        if (strcmp($prev, $next) >= 0) {
            return $this->generateAfter($prev);
        }

        return $this->generateBetween($prev, $next);
    }

    /**
     * Generate a rank strictly greater than $prev.
     */
    public function generateAfter(string $prev): string
    {
        if ($prev === '') {
            return self::INITIAL_RANK;
        }

        $len = strlen($prev);
        $lastChar = $prev[$len - 1];
        $lastIndex = strpos(self::ALPHABET, $lastChar);

        if ($lastIndex === false) {
            $lastIndex = 31;
        }

        $maxIndex = strlen(self::ALPHABET) - 1; // 61 ('z')

        if ($lastIndex < $maxIndex) {
            $mid = (int) ceil(($lastIndex + $maxIndex) / 2);
            if ($mid === $lastIndex) {
                $mid = $lastIndex + 1;
            }

            return substr($prev, 0, $len - 1).self::ALPHABET[$mid];
        }

        // Last character is 'z', append initial rank
        return $prev.self::INITIAL_RANK;
    }

    /**
     * Generate a rank strictly less than $next.
     */
    public function generateBefore(string $next): string
    {
        if ($next === '') {
            return self::INITIAL_RANK;
        }

        $firstChar = $next[0];
        $firstIndex = strpos(self::ALPHABET, $firstChar);

        if ($firstIndex === false) {
            $firstIndex = 31;
        }

        if ($firstIndex > 1) {
            $mid = (int) floor($firstIndex / 2);

            return self::ALPHABET[$mid];
        }

        if ($firstIndex === 1) {
            return self::ALPHABET[0]; // '0'
        }

        // First character is '0'
        if (strlen($next) > 1) {
            return self::ALPHABET[0].$this->generateBefore(substr($next, 1));
        }

        // $next is '0', prepend '0' and half
        return self::ALPHABET[0].self::INITIAL_RANK;
    }

    /**
     * Generate a rank strictly between $prev and $next where $prev < $next.
     */
    private function generateBetween(string $prev, string $next): string
    {
        $minLen = min(strlen($prev), strlen($next));
        $commonLen = 0;

        while ($commonLen < $minLen && $prev[$commonLen] === $next[$commonLen]) {
            $commonLen++;
        }

        $prefix = substr($prev, 0, $commonLen);
        $prevRest = substr($prev, $commonLen);
        $nextRest = substr($next, $commonLen);

        $prevChar = $prevRest !== '' ? $prevRest[0] : '';
        $nextChar = $nextRest !== '' ? $nextRest[0] : '';

        $prevIndex = $prevChar !== '' ? strpos(self::ALPHABET, $prevChar) : -1;
        $nextIndex = $nextChar !== '' ? strpos(self::ALPHABET, $nextChar) : strlen(self::ALPHABET);

        if ($prevIndex === false) {
            $prevIndex = 0;
        }
        if ($nextIndex === false) {
            $nextIndex = strlen(self::ALPHABET) - 1;
        }

        if ($nextIndex - $prevIndex > 1) {
            $mid = (int) floor(($prevIndex + $nextIndex) / 2);

            return $prefix.self::ALPHABET[$mid];
        }

        // Diff is 1 or prev is prefix of next
        if ($prevRest !== '') {
            return $prefix.$prevRest[0].$this->generateAfter(substr($prevRest, 1));
        }

        return $prefix.$this->generateBefore($nextRest);
    }

    /**
     * Rebalance an ordered array of task identifiers to evenly-spaced ranks.
     *
     * @param  array<int, string>  $taskIds
     * @return array<string, string> Map of taskId => newRank
     */
    public function rebalance(array $taskIds): array
    {
        $count = count($taskIds);
        if ($count === 0) {
            return [];
        }

        $alphabetLen = strlen(self::ALPHABET);
        $step = max(1, (int) floor($alphabetLen / ($count + 1)));

        $result = [];
        foreach ($taskIds as $index => $taskId) {
            $charIndex = min($alphabetLen - 1, ($index + 1) * $step);
            $result[$taskId] = self::ALPHABET[$charIndex];
        }

        return $result;
    }
}
