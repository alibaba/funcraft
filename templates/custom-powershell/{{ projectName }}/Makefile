# Install dependencies in Funfile
install:
	fun install -v

# Sync local dependencies to nas
nas-sync: install
	fun nas sync

deploy: nas-sync
	fun deploy -y

invoke:
	fun invoke -e "Hello World"

.PHONY: deploy invoke