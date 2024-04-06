import { ComputedFields, FieldDefs, defineDocumentType, makeSource } from 'contentlayer/source-files'

const commonFields: FieldDefs = {
  title: {
    type: 'string',
    description: 'The title of the post',
    required: true,
  },
  createTime: {
    type: 'date',
    description: 'The date of the post',
    required: true,
  },
  lastUpdateTime: {
    type: 'date'
  },
  draft: {
    type: 'boolean',
    default: true
  },
  aliases: {
    type: 'list',
    of: { type: 'string' },
    default: []
  },
  categories: {
    type: 'list',
    of: { type: 'string' },
    default: []
  },
  tags: {
    type: 'list',
    of: { type: 'string' },
    default: []
  },
  keyword: {
    type: 'list',
    of: { type: 'string' },
    default: []
  },
  summary: {
    type: 'string',
    default: ''
  },
  cssclasses: {
    type: 'list',
    of: { type: 'string' },
    default: []
  },
  source: {
    type: 'string'
  },
  banner: {
    type: 'string'
  },
  images: {
    type: 'json'
  },
  author: {
    type: 'list',
    of: {
      type: 'string'
    }
  },
  layout: {
    type: 'string'
  }
}

const computedFields: ComputedFields = {
  path: {
    type: 'string',
    resolve: (doc) => doc._raw.flattenedPath,
  },
  slug: {
    type: 'string',
    resolve: (doc) => doc._raw.flattenedPath,
  },
  url: {
    type: 'string',
    resolve: (doc) => `/posts/${doc._raw.flattenedPath}`,
  },
  date: {
    type: 'date',
    resolve: (doc) => {
      return doc.createTime
    },
  },
}
const Blog = defineDocumentType(() => ({
  name: 'Blog',
  filePathPattern: `**/*.mdx`,
  contentType: 'mdx',
  fields: {
    ...commonFields
  },
  computedFields: {
    ...computedFields
  },
}))

const Journal = defineDocumentType(() => ({
  name: 'Journal',
  filePathPattern: `**/*.md`,
  contentType: 'mdx',
  fields: {
    ...commonFields
  },
  computedFields: {
    ...computedFields
  },
}))

export default makeSource({
  contentDirPath: 'posts',
  contentDirExclude: ['MyObsidian', 'Excalidraw', '**/*.yml', '**/*.yaml', ".git", ".obsidian", "Journal", "Projects", "Archive", "Areas", "assets", "Reading"],
  documentTypes: [Blog, Journal],
})
