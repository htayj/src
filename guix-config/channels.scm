(list (channel
        (name 'tay)
        (url "https://github.com/htayj/guix-channel")
        (branch "master")
        (introduction
         (make-channel-introduction
          "5de4b5693fae9aa776d089d9818126bc253a69a9"
          (openpgp-fingerprint
           "997E 2BA6 B523 4026 8A39 87E3 D94F 0A11 ACD7 8333"))))
       (channel
        (name 'sops-guix)
        (url "https://github.com/fishinthecalculator/sops-guix.git")
        (branch "main")
        (commit "c53e27e533836ea8595626ba6796dee5362f8c4a")
        (introduction
         (make-channel-introduction
          "0bbaf1fdd25266c7df790f65640aaa01e6d2dbc9"
          (openpgp-fingerprint
           "8D10 60B9 6BB8 292E 829B 7249 AED4 1CC1 93B7 01E2"))))
       (channel
        (name 'nonguix)
        (url "https://gitlab.com/nonguix/nonguix")
        (commit "653504e6551198c9b2b998c143d7cf2675b22547")
        (introduction
         (make-channel-introduction
          "897c1a470da759236cc11798f4e0a5f7d4d59fbc"
          (openpgp-fingerprint
           "2A39 3FFF 68F4 EF7A 3D29 12AF 6F51 20A0 22FB B2D5"))))
       (channel
        (name 'guix)
        (url "https://git.guix.gnu.org/guix.git")
        (branch "master")
        (commit "637a34743d87b25d39f4a6c685b52b49b703e59a")
        (introduction
         (make-channel-introduction
          "9edb3f66fd807b096b48283debdcddccfea34bad"
          (openpgp-fingerprint
           "BBB0 2DDF 2CEA F6A8 0D1D E643 A2A0 6DF2 A33A 54FA")))))
