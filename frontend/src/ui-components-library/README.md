# WhatsOmni UI Components Library

A production-ready, highly polished, dark-mode ready TypeScript & Tailwind CSS component library extracted directly from WhatsOmni.

---

## 📁 Directory Structure

```
ui-components-library/
├── buttons/
│   └── Button.tsx          # Primary, Secondary, Destructive, Row Actions, Icon-Only
├── inputs/
│   ├── Input.tsx           # Text, Email, Password, Search with icon slots & validation
│   ├── Textarea.tsx        # Multi-line text editor with character counter & labels
│   ├── Switch.tsx          # Toggle switch component with labels
│   ├── Checkbox.tsx        # Styled checkbox with checked & indeterminate states
│   ├── RadioGroup.tsx      # Radio button options & group container
│   └── DropdownSelect.tsx  # Select dropdown with search filter & portal support
├── tables/
│   └── DataTable.tsx       # Datatable with search, filters, pagination, row actions
├── dialogs/
│   ├── Dialog.tsx          # Modal dialog with backdrop blur & action footer
│   └── AlertDialog.tsx     # Confirmation dialogs (Danger, Warning, Info, Success)
├── layouts/
│   └── PageLayout.tsx      # Page layout shell with title, breadcrumbs, action bar & sidebar
├── index.ts                # Main export barrel file
└── README.md               # Usage & Integration Guide
```

---

## ⚙️ Quick Installation in Other Projects

### 1. Copy Folder
Copy the `ui-components-library` directory into your project's `src/` folder (e.g. `src/ui-components-library/` or `src/components/ui/`).

### 2. Install Peer Dependencies
Make sure your target project has `lucide-react` installed for icons:

```bash
npm install lucide-react
```

### 3. Ensure Tailwind CSS Setup
These components rely on standard Tailwind CSS classes. Ensure your `tailwind.config.js` includes the path to these files in the `content` array:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./ui-components-library/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
};
```

---

## 💻 Usage Examples

### 1. Buttons (`Button.tsx`)
```tsx
import { Button } from "@/ui-components-library";
import { Plus, Trash2, RefreshCw } from "lucide-react";

// Primary Action Button
<Button variant="primary" leftIcon={<Plus className="h-3.5 w-3.5" />}>
  Create Flow
</Button>

// Secondary Bordered Button
<Button variant="secondary">Cancel</Button>

// Destructive Action
<Button variant="destructive" leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
  Delete Account
</Button>

// Compact Row Action Buttons
<Button variant="compact-secondary">Manage</Button>
<Button variant="compact-destructive">Disconnect</Button>
<Button variant="compact-accent">Impersonate</Button>

// Icon-Only Action Button
<Button variant="icon-only">
  <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
</Button>
```

---

### 2. Form Inputs & Controls
```tsx
import { Input, Textarea, Switch, Checkbox, RadioGroup, DropdownSelect } from "@/ui-components-library";
import { Mail } from "lucide-react";

// Input Text Box with Icon
<Input
  label="Email Address"
  placeholder="name@company.com"
  leftIcon={<Mail className="h-4 w-4" />}
  error={emailError}
/>

// Textarea with Character Counter
<Textarea
  label="Campaign Message"
  placeholder="Type your WhatsApp message..."
  maxLength={500}
  showCharCount
/>

// Switch Toggle
<Switch
  checked={isEnabled}
  onChange={setIsEnabled}
  label="Enable Automated Auto-reply"
  description="Automatically trigger flows when a new lead lands"
/>

// Dropdown Select
<DropdownSelect
  label="Select Channel"
  value={channel}
  onChange={setChannel}
  searchable
  options={[
    { value: "whatsapp", label: "WhatsApp Cloud API" },
    { value: "telegram", label: "Telegram Bot" },
    { value: "messenger", label: "Facebook Messenger" }
  ]}
/>
```

---

### 3. Data Tables (`DataTable.tsx`)
```tsx
import { DataTable, Button } from "@/ui-components-library";

const columns = [
  { key: "name", header: "Campaign Name", sortable: true },
  { key: "status", header: "Status", render: (item) => <span className="badge">{item.status}</span> },
  { key: "sent_count", header: "Messages Sent", align: "right" },
];

<DataTable
  data={campaigns}
  columns={columns}
  keyExtractor={(item) => item.id}
  searchPlaceholder="Search campaigns..."
  primaryActionLabel="New Campaign"
  onPrimaryAction={() => console.log("Create")}
  selectable
  rowActions={(item) => (
    <Button variant="compact-secondary" onClick={() => handleEdit(item)}>
      Edit
    </Button>
  )}
/>
```

---

### 4. Dialogs & Alert Dialogs
```tsx
import { Dialog, AlertDialog, Button } from "@/ui-components-library";

// Standard Dialog Modal
<Dialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Edit Flow Properties"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save Changes</Button>
    </>
  }
>
  <div>Modal Content Goes Here...</div>
</Dialog>

// Quick Confirmation Alert
<AlertDialog
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  onConfirm={handleDelete}
  type="danger"
  title="Delete Integration"
  description="Are you sure you want to permanently remove this WhatsApp driver? This action cannot be undone."
  confirmLabel="Delete Integration"
/>
```

---

### 5. Page Layout (`PageLayout.tsx`)
```tsx
import { PageLayout, Button } from "@/ui-components-library";
import { Plus } from "lucide-react";

<PageLayout
  title="Automated Flows"
  description="Manage multi-channel chat workflows and AI agent triggers."
  breadcrumbs={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Flows" }
  ]}
  actions={
    <Button variant="primary" leftIcon={<Plus className="h-3.5 w-3.5" />}>
      Create Flow
    </Button>
  }
>
  <div>Page main content...</div>
</PageLayout>
```
