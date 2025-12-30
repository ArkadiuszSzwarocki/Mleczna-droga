// This file now acts as a re-exporter to correct any erroneous imports
// pointing to the old monolithic context, redirecting them to the proper
// composed context provider in `./contexts/AppContext`.
export * from './contexts/AppContext';
