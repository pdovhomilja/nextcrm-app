FROM e2b/nodejs:latest

# Install agent-browser globally and download Chrome
RUN npm install -g agent-browser tsx @anthropic-ai/sdk
RUN agent-browser install

# Verify
RUN agent-browser --version
