# [ARCHIVED] Daystrom

> **This project has been renamed and moved.**
>
> - **New repo:** [cdot65/prisma-airs-cli](https://github.com/cdot65/prisma-airs-cli)
> - **npm package:** [`@cdot65/prisma-airs-cli`](https://www.npmjs.com/package/@cdot65/prisma-airs-cli)
> - **Documentation:** [cdot65.github.io/prisma-airs-cli](https://cdot65.github.io/prisma-airs-cli/)

This repository is archived and read-only. All future development continues at **[prisma-airs-cli](https://github.com/cdot65/prisma-airs-cli)**.

## Migration

```bash
# Uninstall old package
npm uninstall -g @cdot65/daystrom

# Install new package
npm install -g @cdot65/prisma-airs-cli

# Migrate local data
cp -r ~/.daystrom/ ~/.prisma-airs/
```

The CLI binary is now `airs` (was `daystrom`). See the [migration guide](https://github.com/cdot65/prisma-airs-cli/blob/main/MIGRATION.md) for full details.
