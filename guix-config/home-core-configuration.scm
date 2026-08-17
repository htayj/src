(use-modules (gnu home)
             (gnu home services)
             (tay home-common))

(home-environment
 (packages %core-home-packages)
 (services %core-home-services))
