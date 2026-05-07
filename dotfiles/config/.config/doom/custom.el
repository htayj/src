(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(safe-local-variable-values
   '((projectile-project-compilation-cmd . "npx lerna run compile --stream")
     (projectile-project-test-cmd . "npx lerna run test --stream")
     (projectile-project-package-cmd . "../script/build")
     (projectile-project-configure-cmd
      . "npx lerna run clean && npm run bootstrap && npx lerna run compile --stream")
     (projectile-project-run-cmd . "npm run dev"))))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
