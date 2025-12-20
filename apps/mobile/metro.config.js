let path = require('path')
let { getDefaultConfig } = require('expo/metro-config')

let projectRoot = __dirname
let workspaceRoot = path.resolve(projectRoot, '../..')

let config = getDefaultConfig(projectRoot)

// Watch all files within the monorepo
config.watchFolders = [workspaceRoot]

// Resolve modules from the workspace root and project root
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, 'node_modules'),
	path.resolve(workspaceRoot, 'node_modules'),
]

// Resolve workspace packages
config.resolver.disableHierarchicalLookup = true

module.exports = config
