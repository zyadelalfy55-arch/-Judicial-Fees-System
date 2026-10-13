param(
  [string]$SourceDirectory,
  [string]$ReportPath = (Join-Path $PSScriptRoot "..\docs\legal-source-inventory.md")
)

$ErrorActionPreference = "Stop"
if (-not $SourceDirectory) {
  $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $SourceDirectory = (Get-ChildItem -LiteralPath $projectRoot -Directory | Where-Object {
    Test-Path -LiteralPath (Join-Path $_.FullName "codex_legal_rules_calculation_explainability_prompt.md")
  } | Select-Object -First 1).FullName
}
$sourceRoot = (Resolve-Path -LiteralPath $SourceDirectory).Path
$files = Get-ChildItem -LiteralPath $sourceRoot -File -Recurse | Sort-Object FullName
$report = [System.Collections.Generic.List[string]]::new()
$report.Add("# Legal Source Inventory")
$report.Add("")
$report.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')")
$report.Add("Source directory: ``$sourceRoot``")
$report.Add("")
$report.Add("Extraction is a technical transcription only. It does not establish authenticity, current force, legal approval, or applicability.")
$report.Add("")
$report.Add("| File | Type | SHA-256 | Extraction | Pages / sheets | Characters / formulas | Citation-like references |")
$report.Add("| --- | --- | --- | --- | ---: | ---: | --- |")

function Escape-Markdown([string]$value) {
  if ($null -eq $value) { return "" }
  return ($value -replace "\|", "\\|" -replace "\s+", " ").Trim()
}

$wordFiles = @($files | Where-Object { $_.Extension.ToLowerInvariant() -in @(".doc", ".docx", ".pdf") })
$excelFiles = @($files | Where-Object { $_.Extension.ToLowerInvariant() -in @(".xls", ".xlsx", ".xlsm") })

if ($wordFiles.Count -gt 0) {
  $word = $null
  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    foreach ($file in $wordFiles) {
      $doc = $null
      try {
        $doc = $word.Documents.Open($file.FullName, $false, $true, $false)
        $text = [string]$doc.Content.Text
        $pageCount = $doc.ComputeStatistics(2)
        $lawTerm = [string]::Concat([char]0x0642, [char]0x0627, [char]0x0646, [char]0x0648, [char]0x0646)
        $articleTerm = [string]::Concat([char]0x0627, [char]0x0644, [char]0x0645, [char]0x0627, [char]0x062F, [char]0x0629)
        $shortArticleTerm = [string]::Concat([char]0x0645, [char]0x0627, [char]0x062F, [char]0x0629)
        $referenceHints = [System.Collections.Generic.List[string]]::new()
        if ($text.Contains($lawTerm)) { $referenceHints.Add("Contains a law reference term") }
        if ($text.Contains($articleTerm) -or $text.Contains($shortArticleTerm)) { $referenceHints.Add("Contains an article reference term") }
        $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $status = if ($text.Trim().Length -gt 0) { "Extracted by Word (read-only)" } else { "No text extracted; OCR/manual review needed" }
        $fileNameMarkdown = Escape-Markdown $file.Name
        $referenceSummary = $referenceHints -join "; "
        $report.Add(("| {0} | {1} | ``{2}`` | {3} | {4} | {5} | {6} |" -f $fileNameMarkdown, $file.Extension, $sha, $status, $pageCount, $text.Length, $referenceSummary))
        $normalized = $text.Replace([char]13, " ").Replace([char]7, " ").Replace([char]11, " ").Trim()
        while ($normalized.Contains("  ")) { $normalized = $normalized.Replace("  ", " ") }
        $excerpt = $normalized.Substring(0, [Math]::Min(900, $normalized.Length))
        $excerptMarkdown = Escape-Markdown $excerpt
        $report.Add("")
        $report.Add("### $fileNameMarkdown")
        $report.Add("")
        $report.Add("- Extraction: $status; $pageCount Word-reported pages; $($text.Length) characters.")
        $report.Add("- Citation-like strings are search hints only and require checking against the original page.")
        $report.Add("- Opening excerpt: $excerptMarkdown")
        $report.Add("")
      } catch {
        $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $fileNameMarkdown = Escape-Markdown $file.Name
        $failure = Escape-Markdown $_.Exception.Message
        $report.Add(("| {0} | {1} | ``{2}`` | Extraction failed: {3} | - | - | - |" -f $fileNameMarkdown, $file.Extension, $sha, $failure))
      } finally {
        if ($doc) { $doc.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
      }
    }
  } finally {
    if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
  }
}

if ($excelFiles.Count -gt 0) {
  $report.Add("")
  $report.Add("## Workbook inventory")
  $report.Add("")
  $report.Add("| File | Type | SHA-256 | Extraction | Sheets | Sheet summary | References |")
  $report.Add("| --- | --- | --- | --- | ---: | --- | --- |")
  $excel = $null
  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    foreach ($file in $excelFiles) {
      $book = $null
      try {
        $book = $excel.Workbooks.Open($file.FullName, 0, $true)
        $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $sheetSummary = [System.Collections.Generic.List[string]]::new()
        foreach ($sheet in $book.Worksheets) {
          $used = $sheet.UsedRange
          $formulaCount = 0
          try { $formulaCount = $used.SpecialCells(-4123).Count } catch { $formulaCount = 0 }
          $visibility = if ($sheet.Visible -eq -1) { "visible" } else { "hidden" }
          $sheetSummary.Add("$($sheet.Name) [$visibility], $($used.Address()), $formulaCount formulas")
          $report.Add("")
          $report.Add("### $(Escape-Markdown($file.Name)) / sheet: $(Escape-Markdown($sheet.Name))")
          $report.Add("")
          $report.Add("- State: $visibility; used range: $($used.Address()); formulas: $formulaCount.")
          $report.Add("- Extracted cell samples include cell address, formula when present, and displayed value.")
          $shown = 0
          for ($row = 1; $row -le [Math]::Min($used.Rows.Count, 250) -and $shown -lt 250; $row++) {
            for ($column = 1; $column -le [Math]::Min($used.Columns.Count, 40) -and $shown -lt 250; $column++) {
              $cell = $used.Cells.Item($row, $column)
              if ($null -ne $cell.Value2 -and [string]$cell.Text -ne "") {
                $formulaValue = [string]$cell.Formula
                $formula = if ($formulaValue -ne [string]$cell.Value2) { "; formula: $formulaValue" } else { "" }
                $cellAddress = $cell.Address($false, $false)
                $cellText = Escape-Markdown ([string]$cell.Text)
                $report.Add(("- `{0}` = {1}{2}" -f $cellAddress, $cellText, $formula))
                $shown++
              }
            }
          }
          if ($shown -ge 250) { $report.Add("- Sample limit reached (250 populated cells); this is not a full cell extraction.") }
        }
        $fileNameMarkdown = Escape-Markdown $file.Name
        $sheetSummaryText = $sheetSummary -join "; "
        $report.Add(("| {0} | {1} | ``{2}`` | Workbook opened read-only; worksheet/cell inspection | {3} sheets | {4} | - |" -f $fileNameMarkdown, $file.Extension, $sha, $book.Worksheets.Count, $sheetSummaryText))
      } catch {
        $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
        $fileNameMarkdown = Escape-Markdown $file.Name
        $failure = Escape-Markdown $_.Exception.Message
        $report.Add(("| {0} | {1} | ``{2}`` | Extraction failed: {3} | - | - | - |" -f $fileNameMarkdown, $file.Extension, $sha, $failure))
      } finally {
        if ($book) { $book.Close($false); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($book) }
      }
    }
  } finally {
    if ($excel) { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
  }
}

foreach ($file in ($files | Where-Object { $_.Extension.ToLowerInvariant() -notin @(".doc", ".docx", ".pdf", ".xls", ".xlsx", ".xlsm") })) {
  $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  $fileNameMarkdown = Escape-Markdown $file.Name
  $report.Add(("| {0} | {1} | ``{2}`` | Not a supported Office/PDF source; preserved as-is | - | {3} bytes | - |" -f $fileNameMarkdown, $file.Extension, $sha, $file.Length))
}

$report.Add("")
$report.Add("## Review Status")
$report.Add("")
$report.Add("No extracted rule is automatically approved. Verify issuing authority, enactment/publication status, effective dates, amendments, article/page citations, and conflicts with the original source before importing into production rules.")
$report | Set-Content -LiteralPath $ReportPath -Encoding UTF8
Write-Output "Inventory written to $ReportPath"
Write-Output "Files inventoried: $($files.Count); Word/PDF files: $($wordFiles.Count); workbooks: $($excelFiles.Count)"
