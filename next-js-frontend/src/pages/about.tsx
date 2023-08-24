import Container from "react-bootstrap/Container";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function About() {
  return (
    <Container>
      <Header activeKey="/about"/>
      <Footer/>
    </Container>
  );
}