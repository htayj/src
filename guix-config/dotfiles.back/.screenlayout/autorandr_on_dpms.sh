while true; do
  # Check if DPMS is active (screen off)
  if xset q | grep -q "DPMS is Enabled"; then
    # Check if the screen is actually on (not in standby, suspend, or off)
    if xset q | grep -q "Monitor is On"; then
      echo "Screen is on! Running your command..."
      autorandr -c
			#damn g9 needs to be sent the signal multiple times to actually wake...
			sleep 1 
      autorandr -c
			sleep 1 
      autorandr -c
			sleep 1 
      autorandr -c
      # Exit the loop or add a delay to avoid continuous execution
      sleep 60 # Wait 5 seconds before checking again
    fi
  fi
  sleep 1 # Check every second
done
