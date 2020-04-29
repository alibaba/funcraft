SHELL := /bin/bash
FUN = ../../../../../bin/fun.js

ZIP_PREFIX := fun-support-custom-django-

clean:
	rm -rf .fun dist

install: clean
	$(FUN) install

update-version: 
	VERSION=$$(git log -n 1 --pretty="format:%h" -- .) \
		&& echo $$VERSION \
		&& ZIP_NAME=$(ZIP_PREFIX)$${VERSION}.zip \
		&& echo $$ZIP_NAME > ZIPNAME

package: update-version 
	@ZIP_NAME=$$(cat ZIPNAME) \
		&& rm -rf dist \
		&& mkdir -p dist/ \
		&& cd .fun \
		&& zip -q -r ../dist/$$ZIP_NAME python/ 

upload:
	../upload.sh