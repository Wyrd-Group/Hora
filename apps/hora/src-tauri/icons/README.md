# Icons

`icon.png` is the master 512×512 source. All other sizes referenced by
`tauri.conf.json` (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`,
`icon.ico`) are generated from it.

Regenerate after editing `icon.png`:

```bash
cd apps/hora
npx tauri icon src-tauri/icons/icon.png
```

This writes the full set into this directory. Commit the generated files.
