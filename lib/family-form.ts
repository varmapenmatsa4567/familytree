import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

interface FormField {
  id: string;
  label: string;
  type: string;
  initial_value?: string;
  options?: { value: string; label: string }[];
}

interface FormFieldOption {
  value: string;
  label: string;
}

interface GenderField {
  id: string;
  type: string;
  label: string;
  initial_value?: string;
  disabled?: boolean;
  options: FormFieldOption[];
}

interface FormCreator {
  datum_id: string;
  fields: FormField[];
  title?: string;
  onSubmit: (e: Event) => void;
  onCancel: () => void;
  onDelete?: () => void;
  addRelative?: () => void;
  removeRelative?: () => void;
  addRelativeActive?: boolean;
  removeRelativeActive?: boolean;
  can_delete?: boolean;
  editable?: boolean;
  no_edit?: boolean;
  gender_field?: GenderField;
}

function openCropModal(
  imageUrl: string,
  onCrop: (croppedDataUrl: string) => void
): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  `;

  const imgWrap = document.createElement("div");
  imgWrap.style.cssText = `
    width:90vw;max-width:500px;height:500px;position:relative;
  `;

  const img = document.createElement("img");
  img.src = imageUrl;
  img.style.maxWidth = "100%";
  imgWrap.appendChild(img);

  const btnBar = document.createElement("div");
  btnBar.style.cssText = "display:flex;gap:12px;";

  const cropBtn = document.createElement("button");
  cropBtn.textContent = "Crop";
  cropBtn.style.cssText = `
    padding:8px 28px;border-radius:6px;border:none;cursor:pointer;font-size:14px;
    background:#3b82f6;color:#fff;
  `;

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    padding:8px 28px;border-radius:6px;border:1px solid #666;cursor:pointer;font-size:14px;
    background:transparent;color:#ccc;
  `;

  btnBar.appendChild(cropBtn);
  btnBar.appendChild(cancelBtn);
  overlay.appendChild(imgWrap);
  overlay.appendChild(btnBar);
  document.body.appendChild(overlay);

  const cropper = new Cropper(img, {
    aspectRatio: 1,
    viewMode: 1,
    autoCropArea: 1,
    responsive: true,
    movable: true,
    zoomable: true,
    background: false,
  });

  cropBtn.onclick = () => {
    const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    cropper.destroy();
    overlay.remove();
    onCrop(dataUrl);
  };

  cancelBtn.onclick = () => {
    cropper.destroy();
    overlay.remove();
  };
}

function avatarHtml(current: string): string {
  return `
    <div class="f3-form-field">
      <label>Avatar</label>
      <div class="f3-avatar-cont" style="display:flex;align-items:center;gap:12px">
        <div class="f3-avatar-preview" style="width:60px;height:60px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#555;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999">
          ${
            current
              ? `<img src="${current}" style="width:100%;height:100%;object-fit:cover" />`
              : "?"
          }
        </div>
        <button type="button" class="f3-avatar-btn" style="padding:6px 14px;border-radius:6px;border:1px solid #666;background:transparent;color:#ccc;cursor:pointer;font-size:13px">Choose image</button>
        <input type="hidden" name="avatar" value="${current || ""}" />
        <input type="file" accept="image/*" style="display:none" />
      </div>
    </div>`;
}

function fieldsHtml(
  fields: FormField[],
  initial_values: Record<string, string>
): string {
  return fields
    .map((f) => {
      const val = initial_values[f.id] || "";
      if (f.id === "birthday") {
        return `
          <div class="f3-form-field">
            <label>Birthday</label>
            <input type="date" name="birthday" value="${val}" />
          </div>`;
      }
      if (f.id === "avatar") return "";
      return `
        <div class="f3-form-field">
          <label>${f.label}</label>
          <input type="text" name="${f.id}" value="${val.replace(/"/g, "&quot;")}" placeholder="${f.label}" />
        </div>`;
    })
    .join("");
}

function genderHtml(current: string): string {
  return `
    <div class="f3-form-field">
      <label>Gender</label>
      <div style="display:flex;gap:20px;margin-top:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="radio" name="gender" value="M" ${
            current === "M" ? "checked" : ""
          } />
          Male
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="radio" name="gender" value="F" ${
            current === "F" ? "checked" : ""
          } />
          Female
        </label>
      </div>
    </div>`;
}

function setupAvatarInput(form: HTMLElement) {
  const btn = form.querySelector(".f3-avatar-btn") as HTMLElement | null;
  const fileInput = form.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement | null;
  const hidden = form.querySelector(
    'input[name="avatar"]'
  ) as HTMLInputElement | null;
  const preview = form.querySelector(
    ".f3-avatar-preview"
  ) as HTMLElement | null;
  if (!btn || !fileInput || !hidden || !preview) return;

  btn.onclick = () => fileInput.click();

  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      openCropModal(imageUrl, (croppedDataUrl) => {
        hidden.value = croppedDataUrl;
        preview.innerHTML = `<img src="${croppedDataUrl}" style="width:100%;height:100%;object-fit:cover" />`;
      });
    };
    reader.readAsDataURL(file);
  };
}

function collectFormData(
  form: HTMLElement,
  fields: FormField[],
  initial: Record<string, string>,
  hiddenAvatar: HTMLInputElement | null
): Record<string, string> {
  const data = new FormData(form as HTMLFormElement);
  for (const f of fields) {
    if (f.id === "avatar") continue;
    const v = data.get(f.id) as string | null;
    if (v !== null) initial[f.id] = v;
  }
  if (hiddenAvatar) initial.avatar = hiddenAvatar.value;
  initial.gender = (data.get("gender") as string) || "M";
  return initial;
}

function buildForm(
  form_creator: FormCreator,
  closeCallback: () => void,
  isEdit: boolean
): HTMLElement {
  const initial: Record<string, string> = {};
  for (const f of form_creator.fields) {
    initial[f.id] = f.initial_value ?? "";
  }
  const gender = form_creator.gender_field?.initial_value || "M";
  const avatar = initial.avatar || "";

  const buttons = isEdit
    ? `
      <div class="f3-form-buttons">
        <button type="button" class="f3-cancel-btn" data-cancel>Cancel</button>
        <button type="submit">Submit</button>
      </div>
      <hr />
      <button type="button" class="f3-delete-btn" data-delete>Delete</button>
      <button type="button" class="f3-remove-rel-btn" data-remove-rel>Remove relation</button>`
    : `
      <div class="f3-form-buttons">
        <button type="button" class="f3-cancel-btn" data-cancel>Cancel</button>
        <button type="submit">Submit</button>
      </div>`;

  const header = isEdit
    ? `
      <div style="text-align:right;display:block">
        <button type="button" class="f3-add-rel-btn" data-add-rel title="Add relative">👤+</button>
      </div>
      <h3 class="f3-form-title">Edit Person</h3>`
    : `<h3 class="f3-form-title">${form_creator.title || "Add Person"}</h3>`;

  const html = `
    <form id="familyForm" class="f3-form">
      <span class="f3-close-btn" data-close>×</span>
      ${header}
      ${genderHtml(gender)}
      ${fieldsHtml(form_creator.fields, initial)}
      ${avatarHtml(avatar)}
      ${buttons}
    </form>`;

  const el = document.createElement("div");
  el.innerHTML = html;
  const form = el.firstElementChild as HTMLElement;

  form.querySelector("[data-close]")?.addEventListener("click", closeCallback);
  form
    .querySelector("[data-cancel]")
    ?.addEventListener("click", closeCallback);

  if (isEdit) {
    form
      .querySelector("[data-add-rel]")
      ?.addEventListener("click", () => form_creator.addRelative?.());
    form
      .querySelector("[data-remove-rel]")
      ?.addEventListener("click", () => form_creator.removeRelative?.());
    const deleteBtn = form.querySelector("[data-delete]") as HTMLElement | null;
    if (deleteBtn) {
      if (!form_creator.can_delete) deleteBtn.style.display = "none";
      deleteBtn.addEventListener("click", () => form_creator.onDelete?.());
    }
  }

  setupAvatarInput(form);

  const avatarHidden = form.querySelector(
    'input[name="avatar"]'
  ) as HTMLInputElement | null;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    collectFormData(form, form_creator.fields, initial, avatarHidden);
    for (const f of form_creator.fields) {
      f.initial_value = initial[f.id] ?? "";
    }
    if (form_creator.gender_field) {
      form_creator.gender_field.initial_value = initial.gender || "M";
    }

    const syntheticEvent = new Event("submit", { bubbles: true });
    Object.defineProperty(syntheticEvent, "target", {
      value: form,
      writable: false,
    });
    form_creator.onSubmit(syntheticEvent);
  });

  return el;
}

export function createEditForm(
  form_creator: FormCreator,
  closeCallback: () => void
): HTMLElement {
  return buildForm(form_creator, closeCallback, true);
}

export function createNewForm(
  form_creator: FormCreator,
  closeCallback: () => void
): HTMLElement {
  return buildForm(form_creator, closeCallback, false);
}
