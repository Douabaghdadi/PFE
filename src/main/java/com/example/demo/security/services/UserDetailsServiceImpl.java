package com.example.demo.security.services;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Chercher d'abord par username, puis par email
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username or email: " + username)));

        return UserDetailsImpl.build(user);
    }
}
