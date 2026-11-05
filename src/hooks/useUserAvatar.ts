import { useMutation, useQuery } from "@apollo/client/react";
import { PROFILE_QUERY, UPDATE_PROFILE } from "@/lib/graphql";
import { getAvatarSource, isValidAvatarId, normalizeAvatarId } from "@/lib/avatars";

type ProfileData = { profile: { avatar: string | null } };

export function useUserAvatar() {
  const { data, loading } = useQuery<ProfileData>(PROFILE_QUERY, {
    fetchPolicy: "cache-first",
  });
  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: PROFILE_QUERY }],
  });

  const avatarId = isValidAvatarId(data?.profile?.avatar)
    ? normalizeAvatarId(data!.profile!.avatar)
    : null;
  const avatarSource = avatarId ? getAvatarSource(avatarId) : null;

  const setAvatar = async (id: string | null): Promise<boolean> => {
    try {
      await updateProfile({ variables: { avatar: id } });
      return true;
    } catch {
      return false;
    }
  };

  return { avatarId, avatarSource, loading, setAvatar };
}
