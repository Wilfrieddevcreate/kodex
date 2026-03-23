import Swal from "sweetalert2";

const swalDark = Swal.mixin({
  background: "#141419",
  color: "#fff",
  confirmButtonColor: "#14708E",
  cancelButtonColor: "#333",
  customClass: {
    popup: "!rounded-2xl !border !border-white/10",
    confirmButton: "!rounded-xl !px-6 !py-2.5 !text-sm !font-semibold",
    cancelButton: "!rounded-xl !px-6 !py-2.5 !text-sm !font-semibold",
    title: "!text-lg !font-bold",
    htmlContainer: "!text-sm !text-white/50",
  },
});

export async function confirmDelete(itemName: string): Promise<boolean> {
  const result = await swalDark.fire({
    title: "Delete?",
    html: `Are you sure you want to delete <strong class="text-white">${itemName}</strong>? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
  });
  return result.isConfirmed;
}

export async function confirmAction(title: string, text: string): Promise<boolean> {
  const result = await swalDark.fire({
    title,
    html: text,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Confirm",
    cancelButtonText: "Cancel",
  });
  return result.isConfirmed;
}

export function showSuccess(title: string, text?: string) {
  swalDark.fire({
    title,
    text,
    icon: "success",
    timer: 2000,
    showConfirmButton: false,
  });
}

export function showError(title: string, text?: string) {
  swalDark.fire({
    title,
    text,
    icon: "error",
  });
}
