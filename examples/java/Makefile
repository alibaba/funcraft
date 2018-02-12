init:
	mvn archetype:generate -DgroupId=example -DartifactId=demo -DarchetypeArtifactId=maven-archetype-quickstart -Dversion=1.0-SNAPSHOT -B

clean:
	cd demo && mvn clean
	rm demo.jar

build:
	cd demo && mvn package
	mv demo/target/demo-1.0-SNAPSHOT-jar-with-dependencies.jar ./demo.jar

deploy: build
	fun deploy
