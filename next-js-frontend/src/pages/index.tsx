import Container from "react-bootstrap/Container";
import Header from "@/components/header";
import CartridgesList from "@/components/cartridges_list";
import Footer from "@/components/footer";

export default function HomePage() {
  return (
    <Container id="page-container">
      <Header activeKey="/"/>
      <CartridgesList/>
      <Footer/>
    </Container>
  );
}