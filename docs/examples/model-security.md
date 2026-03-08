# Model Security Operations

This guide walks through managing AI Model Security using the `daystrom model-security` command group — security groups, rules, and rule instances.

---

## Security Groups

### List groups

```bash
daystrom model-security groups list
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Security Groups:

  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Default GCS Group  ACTIVE  source: GCS
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Default LOCAL Group  ACTIVE  source: LOCAL
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Default S3 Group  ACTIVE  source: S3
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Default AZURE Group  ACTIVE  source: AZURE
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Default HUGGING_FACE Group  ACTIVE  source: HUGGING_FACE
```

### Filter groups

```bash
# By source type
daystrom model-security groups list --source-types LOCAL,S3

# Search by name
daystrom model-security groups list --search "Default"

# Sort by creation date
daystrom model-security groups list --sort-field created_at --sort-dir desc
```

### Get group details

```bash
daystrom model-security groups get <uuid>
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Security Group Detail:

    UUID:        xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Name:        Default LOCAL Group
    Description: Default security group for LOCAL source type
    Source Type: LOCAL
    State:       ACTIVE
    Created:     2025-08-15T10:30:00.000Z
    Updated:     2025-08-15T10:30:00.000Z
```

### Create a group

Create a JSON configuration file:

```json title="group-config.json"
{
  "name": "Custom S3 Group",
  "source_type": "S3",
  "description": "Custom security group for S3 model sources"
}
```

```bash
daystrom model-security groups create --config group-config.json
```

### Update a group

```bash
daystrom model-security groups update <uuid> --name "Renamed Group"
daystrom model-security groups update <uuid> --description "Updated description"
```

### Delete a group

```bash
daystrom model-security groups delete <uuid>
```

---

## Security Rules

Rules define the security checks applied to models. They are read-only — managed by Prisma AIRS.

### List rules

```bash
daystrom model-security rules list --limit 5
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Security Rules:

  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Unsafe Deserialization  type: SECURITY  default: BLOCKING
    Detects model files using unsafe serialization formats
    Sources: LOCAL, S3, GCS, AZURE, HUGGING_FACE
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Malicious Code Injection  type: SECURITY  default: BLOCKING
    Scans for embedded malicious code in model artifacts
    Sources: LOCAL, S3, GCS, AZURE, HUGGING_FACE
```

### Filter rules

```bash
# By source type
daystrom model-security rules list --source-type LOCAL

# Search by name
daystrom model-security rules list --search "deserialization"
```

### Get rule details

```bash
daystrom model-security rules get <uuid>
```

Shows full rule detail including description, compatible sources, remediation steps, and editable fields.

---

## Rule Instances

Rule instances are the per-group configuration of security rules. Each group has instances for the rules applicable to its source type.

### List rule instances

```bash
daystrom model-security rule-instances list <groupUuid>
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Rule Instances:

  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Unsafe Deserialization  BLOCKING
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Malicious Code Injection  BLOCKING
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    License Compliance  ALLOWING
```

### Filter rule instances

```bash
# By state
daystrom model-security rule-instances list <groupUuid> --state BLOCKING

# By security rule
daystrom model-security rule-instances list <groupUuid> --security-rule-uuid <ruleUuid>
```

### Get rule instance details

```bash
daystrom model-security rule-instances get <groupUuid> <instanceUuid>
```

### Update a rule instance

Create a JSON configuration file:

```json title="rule-instance-update.json"
{
  "state": "BLOCKING",
  "field_values": {
    "threshold": 0.9
  }
}
```

```bash
daystrom model-security rule-instances update <groupUuid> <instanceUuid> --config rule-instance-update.json
```

---

## Scans

### List scans

```bash
daystrom model-security scans list
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Model Security Scans:

  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    COMPLETED  2025-09-01T14:30:00.000Z
    Rules: 8 passed  2 failed  / 10 total
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    COMPLETED  2025-09-02T10:00:00.000Z
    Rules: 10 passed  0 failed  / 10 total
```

### Filter scans

```bash
# By evaluation outcome
daystrom model-security scans list --eval-outcome FAILED

# By source type
daystrom model-security scans list --source-type LOCAL

# Search
daystrom model-security scans list --search "model-name"
```

### Get scan details

```bash
daystrom model-security scans get <uuid>
```

### View scan evaluations

```bash
daystrom model-security scans evaluations <scanUuid>
```

```
  Prisma AIRS — Model Security
  ML model supply chain security

  Rule Evaluations:

  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Unsafe Deserialization  ALLOWED
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    Malicious Code Injection  BLOCKED
```

### View violations

```bash
daystrom model-security scans violations <scanUuid>
```

### View scanned files

```bash
daystrom model-security scans files <scanUuid>

# Filter by result
daystrom model-security scans files <scanUuid> --result FAILED
```

---

## Labels

Labels help organize and categorize scans.

### Add labels

```bash
daystrom model-security labels add <scanUuid> --labels '[{"key":"env","value":"prod"}]'
```

### Set labels (replace all)

```bash
daystrom model-security labels set <scanUuid> --labels '[{"key":"env","value":"staging"},{"key":"team","value":"ml"}]'
```

### Delete labels

```bash
daystrom model-security labels delete <scanUuid> --keys env,team
```

### Browse label taxonomy

```bash
# List all label keys
daystrom model-security labels keys

# List values for a key
daystrom model-security labels values env
```

---

## PyPI Authentication

Get authentication URL for Google Artifact Registry (used for model scanning tools).

```bash
daystrom model-security pypi-auth
```

---

## Common Workflows

### Audit a model source

1. List available groups to find the right source type:
   ```bash
   daystrom model-security groups list --source-types S3
   ```

2. Check which rules are active:
   ```bash
   daystrom model-security rule-instances list <groupUuid> --state BLOCKING
   ```

3. Review a specific rule's remediation steps:
   ```bash
   daystrom model-security rules get <ruleUuid>
   ```

### Customize rule enforcement

1. List rule instances in a group:
   ```bash
   daystrom model-security rule-instances list <groupUuid>
   ```

2. Change a rule from ALLOWING to BLOCKING:
   ```bash
   echo '{"state": "BLOCKING"}' > update.json
   daystrom model-security rule-instances update <groupUuid> <instanceUuid> --config update.json
   ```
