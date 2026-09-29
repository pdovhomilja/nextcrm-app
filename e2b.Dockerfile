FROM e2bdev/base:latest

# agent-browser + tsx are invoked as CLIs, so global is fine; agent-browser install downloads Chrome.
RUN npm install -g agent-browser tsx
RUN agent-browser install

# The enrichment agent runs as /home/user/agent.mjs and does `import '@anthropic-ai/sdk'`.
# ESM bare-specifier resolution searches node_modules from the file's directory upward and
# ignores the global prefix and NODE_PATH, so the SDK must be installed LOCALLY under /home/user.
WORKDIR /home/user
RUN npm install @anthropic-ai/sdk

# Verify
RUN agent-browser --version
