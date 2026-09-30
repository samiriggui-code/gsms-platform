#!/bin/bash
docker inspect traefik-mvbo-traefik-1 -f '{{.Name}} {{json .NetworkSettings.Networks}}' | head -c 800
echo
docker inspect gsms-comp-app -f '{{.Name}} {{json .NetworkSettings.Networks}}' | head -c 800
echo
docker network ls
