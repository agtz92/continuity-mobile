import { gql } from "@apollo/client";
import { ADMIN_HELP_CATEGORY_FIELDS, ADMIN_HELP_RESOURCE_FIELDS, BLOG_POST_FRAGMENT, PAGE_FRAGMENT } from "./fragments";

export const ADMIN_BLOG_POSTS_QUERY = gql`
  ${BLOG_POST_FRAGMENT}
  query AdminBlogPosts(
    $page: Int
    $perPage: Int
    $status: String
    $search: String
  ) {
    adminBlogPosts(
      page: $page
      perPage: $perPage
      status: $status
      search: $search
    ) {
      posts {
        ...AdminBlogPostFields
      }
      page
      perPage
      hasNext
    }
  }
`;


export const ADMIN_BLOG_POST_QUERY = gql`
  ${BLOG_POST_FRAGMENT}
  query AdminBlogPost($id: ID!) {
    adminBlogPost(id: $id) {
      ...AdminBlogPostFields
    }
  }
`;


export const ADMIN_BLOG_POST_CREATE = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostCreate($data: BlogPostInput!) {
    adminBlogPostCreate(data: $data) {
      ...AdminBlogPostFields
    }
  }
`;


export const ADMIN_BLOG_POST_UPDATE = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostUpdate($id: ID!, $data: BlogPostInput!) {
    adminBlogPostUpdate(id: $id, data: $data) {
      ...AdminBlogPostFields
    }
  }
`;


export const ADMIN_BLOG_POST_PUBLISH = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostPublish($id: ID!, $published: Boolean!) {
    adminBlogPostPublish(id: $id, published: $published) {
      ...AdminBlogPostFields
    }
  }
`;


export const ADMIN_BLOG_POST_DELETE = gql`
  mutation AdminBlogPostDelete($id: ID!) {
    adminBlogPostDelete(id: $id)
  }
`;


export const ADMIN_PAGES_QUERY = gql`
  ${PAGE_FRAGMENT}
  query AdminPages($page: Int, $perPage: Int, $status: String) {
    adminPages(page: $page, perPage: $perPage, status: $status) {
      ...AdminPageFields
    }
  }
`;


export const ADMIN_PAGE_QUERY = gql`
  ${PAGE_FRAGMENT}
  query AdminPage($id: ID!) {
    adminPage(id: $id) {
      ...AdminPageFields
    }
  }
`;


export const ADMIN_PAGE_CREATE = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPageCreate($data: PageInput!) {
    adminPageCreate(data: $data) {
      ...AdminPageFields
    }
  }
`;


export const ADMIN_PAGE_UPDATE = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPageUpdate($id: ID!, $data: PageInput!) {
    adminPageUpdate(id: $id, data: $data) {
      ...AdminPageFields
    }
  }
`;


export const ADMIN_PAGE_PUBLISH = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPagePublish($id: ID!, $published: Boolean!) {
    adminPagePublish(id: $id, published: $published) {
      ...AdminPageFields
    }
  }
`;


export const ADMIN_PAGE_DELETE = gql`
  mutation AdminPageDelete($id: ID!) {
    adminPageDelete(id: $id)
  }
`;

// ===== Admin — biblioteca de medios =====


export const ADMIN_MEDIA_ASSETS_QUERY = gql`
  query AdminMediaAssets($page: Int, $perPage: Int) {
    adminMediaAssets(page: $page, perPage: $perPage) {
      assets {
        id
        storagePath
        publicUrl
        originalFilename
        mimeType
        sizeBytes
        width
        height
        createdAt
      }
      page
      perPage
      hasNext
    }
  }
`;


export const ADMIN_MEDIA_REGISTER = gql`
  mutation AdminMediaRegister($data: MediaRegisterInput!) {
    adminMediaRegister(data: $data) {
      id
      storagePath
      publicUrl
      originalFilename
      mimeType
      sizeBytes
      width
      height
      createdAt
    }
  }
`;


export const ADMIN_MEDIA_DELETE = gql`
  mutation AdminMediaDelete($id: ID!) {
    adminMediaDelete(id: $id)
  }
`;

// ===== Admin — centro de ayuda (categorías y recursos) =====

// Campos de una categoría de ayuda; reutilizado por las ops de categorías (CRUD).
// NOTE: string de campos, no fragment gql — candidato a convertir en fragment.

export const ADMIN_HELP_CATEGORIES_QUERY = gql`
  query AdminHelpCategories($locale: String) {
    adminHelpCategories(locale: $locale) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;


export const ADMIN_HELP_CATEGORY_CREATE = gql`
  mutation AdminHelpCategoryCreate($data: HelpCategoryInput!) {
    adminHelpCategoryCreate(data: $data) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;


export const ADMIN_HELP_CATEGORY_UPDATE = gql`
  mutation AdminHelpCategoryUpdate($id: ID!, $data: HelpCategoryInput!) {
    adminHelpCategoryUpdate(id: $id, data: $data) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;


export const ADMIN_HELP_CATEGORY_DELETE = gql`
  mutation AdminHelpCategoryDelete($id: ID!) {
    adminHelpCategoryDelete(id: $id)
  }
`;


export const ADMIN_HELP_RESOURCES_QUERY = gql`
  query AdminHelpResources(
    $page: Int
    $perPage: Int
    $status: String
    $locale: String
    $categoryId: ID
    $search: String
  ) {
    adminHelpResources(
      page: $page
      perPage: $perPage
      status: $status
      locale: $locale
      categoryId: $categoryId
      search: $search
    ) {
      resources {
        ${ADMIN_HELP_RESOURCE_FIELDS}
      }
      page
      perPage
      hasNext
    }
  }
`;


export const ADMIN_HELP_RESOURCE_QUERY = gql`
  query AdminHelpResource($id: ID!) {
    adminHelpResource(id: $id) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;


export const ADMIN_HELP_RESOURCE_CREATE = gql`
  mutation AdminHelpResourceCreate($data: HelpResourceInput!) {
    adminHelpResourceCreate(data: $data) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;


export const ADMIN_HELP_RESOURCE_UPDATE = gql`
  mutation AdminHelpResourceUpdate($id: ID!, $data: HelpResourceInput!) {
    adminHelpResourceUpdate(id: $id, data: $data) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;


export const ADMIN_HELP_RESOURCE_PUBLISH = gql`
  mutation AdminHelpResourcePublish($id: ID!, $published: Boolean!) {
    adminHelpResourcePublish(id: $id, published: $published) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;


export const ADMIN_HELP_RESOURCE_DELETE = gql`
  mutation AdminHelpResourceDelete($id: ID!) {
    adminHelpResourceDelete(id: $id)
  }
`;

// ===== Admin — cola de jobs de notificación =====
