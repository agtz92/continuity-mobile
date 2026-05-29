import { useMutation } from "@apollo/client/react";
import {
  CREATE_CATEGORY,
  DASHBOARD_QUERY,
  DELETE_CATEGORY,
  UPDATE_CATEGORY,
} from "@/lib/graphql";
import { confirmAsync } from "@/lib/confirm";
import type { Category } from "@/lib/types";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useCategoryMutations() {
  const [createCategoryM] = useMutation(CREATE_CATEGORY, refetchAfter);
  const [updateCategoryM] = useMutation(UPDATE_CATEGORY, refetchAfter);
  const [deleteCategoryM] = useMutation(DELETE_CATEGORY, refetchAfter);

  const createCategory = async (input: {
    name: string;
    color: string;
  }): Promise<Category | null> => {
    try {
      const res = await createCategoryM({ variables: { data: input } });
      const data = res.data as { createCategory?: Category } | null | undefined;
      return data?.createCategory ?? null;
    } catch {
      return null;
    }
  };

  const updateCategory = async (
    id: string,
    input: { name: string; color: string }
  ): Promise<boolean> => {
    try {
      await updateCategoryM({ variables: { id, data: input } });
      return true;
    } catch {
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    const ok = await confirmAsync(
      "Delete category?",
      "Projects in it will become uncategorized."
    );
    if (!ok) return false;
    try {
      await deleteCategoryM({ variables: { id } });
      return true;
    } catch {
      return false;
    }
  };

  return { createCategory, updateCategory, deleteCategory };
}
