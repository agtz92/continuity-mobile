import { useMutation } from "@apollo/client/react";
import {
  CREATE_IDEA,
  DASHBOARD_QUERY,
  DELETE_IDEA,
  PROMOTE_IDEA,
  UPDATE_IDEA,
} from "@/lib/graphql";

const refetchAfter = { refetchQueries: [{ query: DASHBOARD_QUERY }] };

export function useIdeaMutations() {
  const [createIdea] = useMutation(CREATE_IDEA, refetchAfter);
  const [updateIdeaM] = useMutation(UPDATE_IDEA, refetchAfter);
  const [deleteIdeaM] = useMutation(DELETE_IDEA, refetchAfter);
  const [promoteIdeaM] = useMutation(PROMOTE_IDEA, refetchAfter);

  const saveIdea = async (i: {
    id?: string;
    title: string;
    description: string;
    why: string;
  }): Promise<boolean> => {
    const data = {
      title: i.title,
      description: i.description,
      why: i.why,
    };
    try {
      if (i.id) {
        await updateIdeaM({ variables: { id: i.id, data } });
      } else {
        await createIdea({ variables: { data } });
      }
      return true;
    } catch {
      return false;
    }
  };

  const deleteIdea = async (id: string): Promise<void> => {
    try {
      await deleteIdeaM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  const promoteIdea = async (id: string): Promise<void> => {
    try {
      await promoteIdeaM({ variables: { id } });
    } catch {
      /* swallow — surface errors at the screen layer */
    }
  };

  return {
    saveIdea,
    deleteIdea,
    promoteIdea,
    raw: { createIdea, deleteIdea: deleteIdeaM },
  };
}
