SHELL=/bin/bash
PYTHON=python3

PYTHON_ENV_ROOT=envs
PYTHON_DEV_ENV=$(PYTHON_ENV_ROOT)/$(PYTHON)-dev
PYTHON_PACKAGING_ENV=$(PYTHON_ENV_ROOT)/$(PYTHON)-packaging-env

HOST=localhost
PORT=8080
LOG_LEVEL=info
SHELL_SERVER_URL=file://socket

.PHONY: clean doc sdist test ci-test shell freeze

# development environment #####################################################
$(PYTHON_DEV_ENV)/.created: REQUIREMENTS.dev.txt
	rm -rf $(PYTHON_DEV_ENV) && \
	$(PYTHON) -m venv $(PYTHON_DEV_ENV) && \
	. $(PYTHON_DEV_ENV)/bin/activate && \
	pip install pip --upgrade && \
	pip install -r ./REQUIREMENTS.dev.txt && \
	date > $(PYTHON_DEV_ENV)/.created

dev-env: $(PYTHON_DEV_ENV)/.created

# packaging environment #######################################################
$(PYTHON_PACKAGING_ENV)/.created: REQUIREMENTS.packaging.txt
	rm -rf $(PYTHON_PACKAGING_ENV) && \
	$(PYTHON) -m venv $(PYTHON_PACKAGING_ENV) && \
	. $(PYTHON_PACKAGING_ENV)/bin/activate && \
	pip install --upgrade pip && \
	pip install -r REQUIREMENTS.packaging.txt
	date > $(PYTHON_PACKAGING_ENV)/.created

packaging-env: $(PYTHON_PACKAGING_ENV)/.created

# environment helper ##########################################################
clean:
	rm -rf $(PYTHON_ENV_ROOT)

shell: dev-env
	. $(PYTHON_DEV_ENV)/bin/activate && \
	rlpython

freeze: dev-env
	. $(PYTHON_DEV_ENV)/bin/activate && \
	pip freeze

# packaging ###################################################################
sdist: packaging-env
	. $(PYTHON_PACKAGING_ENV)/bin/activate && \
	rm -rf dist *.egg-info && \
	./setup.py sdist

_release: sdist
	. $(PYTHON_PACKAGING_ENV)/bin/activate && \
	twine upload --config-file ~/.pypirc.fscherf dist/*

# server ######################################################################
server: dev-env
	. $(PYTHON_DEV_ENV)/bin/activate && \
	lona run-server \
		--project-root=wwm \
		-s settings.py \
		--host $(HOST) \
		--port $(PORT) \
		--log-level=$(LOG_LEVEL) \
		--shell-server-url=$(SHELL_SERVER_URL) \
		$(args)

server-shell: dev-env
	. $(PYTHON_DEV_ENV)/bin/activate && \
	rlpython $(SHELL_SERVER_URL) $(args)
