$env:CI="true"
$env:METRICS_ONLY="true"

$totalRuns = 25
$suites = @('baseline', 'commuter', 'budget', 'worst')
$totalSteps = $totalRuns * $suites.Count

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

for ($run = 1; $run -le $totalRuns; $run++) {
    $completedRuns = $run - 1

    if ($completedRuns -gt 0) {
        $elapsedSeconds = $stopwatch.Elapsed.TotalSeconds
        $avgTimePerRun = $elapsedSeconds / $completedRuns
        $runsRemaining = $totalRuns - $completedRuns
        $secondsRemaining = $avgTimePerRun * $runsRemaining
        $etaText = [timespan]::FromSeconds($secondsRemaining).ToString('hh\:mm\:ss')
    } else {
        $etaText = "Calculating..."
    }

    $runStatusText = "Iteration $run of $totalRuns | Overall ETA: $etaText"

    $suiteIndex = 0
    foreach ($suite in $suites) {
        $suiteIndex++

        $currentOverallStep = ($completedRuns * $suites.Count) + $suiteIndex
        $overallPercentComplete = [int]((($currentOverallStep - 1) / $totalSteps) * 100)

        Write-Progress -Id 1 -Activity "E2E Tests: Overall Progress" -Status $runStatusText -PercentComplete $overallPercentComplete

        # Child Progress Bar (Current Suite inside the iteration)
        $suitePercentComplete = [int]((($suiteIndex - 1) / $suites.Count) * 100)
        Write-Progress -Id 2 -ParentId 1 -Activity "Executing Iteration $run" -Status "Running suite: $suite" -PercentComplete $suitePercentComplete

        pnpm run test:e2e:$suite -- -g "Storage Footprint"
    }
}

# Clean up the progress bars and display the final elapsed time
Write-Progress -Id 1 -Activity "E2E Tests: Overall Progress" -Completed
Write-Progress -Id 2 -Activity "Executing Iteration" -Completed
$stopwatch.Stop()

$totalTime = $stopwatch.Elapsed.ToString('hh\:mm\:ss')
Write-Host "All $totalRuns iterations completed in $totalTime." -ForegroundColor Green