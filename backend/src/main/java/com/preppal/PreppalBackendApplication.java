package com.preppal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PreppalBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(PreppalBackendApplication.class, args);
	}

}
