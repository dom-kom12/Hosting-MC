#!/bin/bash

# Uruchomienie Telebit na porcie 8080 (lub innym, jeśli chcesz)
while true
do
  telebit http 4000
  echo "Telebit został zamknięty. Restartuję po 3 sekundach..."
  sleep 3  # Czekaj 10 sekund przed restartem
done
