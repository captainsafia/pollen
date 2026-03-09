import { getRuntimeConfig, type RepositoryConfig } from "@/config/runtime-config";
import { AppError } from "@/lib/errors";

export const assertRepositoryAllowedForApiKey = (
  targetRepository: string,
  allowedRepositories: string[]
): void => {
  if (!allowedRepositories.includes(targetRepository)) {
    throw new AppError("repository_not_allowed", "Repository is not allowed for this application", 403);
  }
};

export const getEnabledRepositoryConfig = (targetRepository: string): RepositoryConfig => {
  const { repositories } = getRuntimeConfig();
  const repository = repositories.find((item) => item.name === targetRepository);
  if (!repository) {
    throw new AppError("repository_not_allowed", "Repository is not configured", 403);
  }
  if (!repository.enabled) {
    throw new AppError("repository_disabled", "Repository is disabled", 403);
  }
  return repository;
};
