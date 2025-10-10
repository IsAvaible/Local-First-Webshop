To update all shadcn components use the following command:

Bash:

```bash
for file in src/components/ui/*.tsx; do pnpm dlx shadcn@latest add -y -o $(basename "$file" .tsx); done
```

PowerShell:

```powershell
Get-ChildItem -Path src/components/ui/ -Filter *.tsx | ForEach-Object { $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name); pnpm dlx shadcn@latest add -y -o $baseName; }
```
